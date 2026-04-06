# app/api/routes/users.py

import json
from asyncio import gather
from typing import Any

from aiofiles import open as aopen
from fastapi import Depends, File, Form, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log as log
from app.api.deps import (
    create_certificate,
    create_education,
    create_experience,
    create_extractor,
    create_orchestration_event,
    create_orchestration_pipeline,
    create_skill,
    create_user,
    fastapi_users,
    get_async_session,
    get_current_superuser,
    get_current_user,
    get_extractor_by_name,
    get_orchestration_pipeline_by_name,
    models,
    run_extractor,
    schemas,
)
from app.core.datetime_utils import now_utc_naive
from app.core.url_parsers import extract_text_from_url_smart
from app.core.url_safety import UnsafeFetchUrlError
from app.extractor.parsing import parse_binary_input

router = fastapi_users.get_users_router(schemas.UserRead, schemas.UserUpdate)


async def get_profile_extract_payload(
    file: UploadFile | None = File(default=None),
    mode: str = Form(default="entire_document"),
    text: str | None = Form(default=None),
    url: str | None = Form(default=None),
    llm: str | None = Form(default=None),
    sources_json: str | None = Form(default=None),
    source_files: list[UploadFile] = File(default=[]),
) -> schemas.ExtractorRun:
    """Parse single-source or multi-source profile extract payload from FormData.

    Multi-source: ``sources_json`` is a JSON array of objects, each with optional
    ``url``, ``text``, and ``file_index`` (int referencing ``source_files``).
    ``source_files`` carries the actual UploadFile objects matched by index.

    Single-source: standard ``file``/``url``/``text`` fields.
    """

    def _strip(value: str | None) -> str | None:
        if not value:
            return None

        stripped_value = value.strip()
        if not stripped_value or stripped_value.lower() in ("null", "undefined"):
            return None

        return stripped_value

    if sources_json and _strip(sources_json):
        try:
            raw_sources: list[dict[str, Any]] = json.loads(sources_json)
        except (json.JSONDecodeError, TypeError) as exc:
            raise HTTPException(
                status_code=400, detail=f"Invalid sources_json: {exc}"
            ) from exc

        parsed: list[schemas.ProfileExtractSource] = []
        for entry in raw_sources:
            src_url = entry.get("url")
            src_text = entry.get("text")
            file_idx = entry.get("file_index")
            src_file: UploadFile | None = None
            if file_idx is not None and 0 <= int(file_idx) < len(source_files):
                src_file = source_files[int(file_idx)]
            try:
                parsed.append(
                    schemas.ProfileExtractSource(
                        url=src_url,
                        text=src_text,
                        file=src_file,
                    )
                )
            except ValidationError as exc:
                raise RequestValidationError(exc.errors()) from exc

        try:
            return schemas.ExtractorRun(
                mode=mode,
                llm=_strip(llm),
                sources=parsed,
            )
        except ValidationError as exc:
            raise RequestValidationError(exc.errors()) from exc

    # Single-source fallback
    try:
        return schemas.ExtractorRun(
            mode=mode,
            file=file,
            text=_strip(text),
            url=_strip(url),
            llm=_strip(llm),
        )
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc


@router.get("/me/profile", response_model=schemas.UserProfileRead)
async def read_profile(
    db: AsyncSession = Depends(get_async_session),
    current_user: models.User = Depends(get_current_user),
) -> schemas.UserProfileRead:

    # Use async loading of related objects
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.skills),
            selectinload(models.User.experiences),
            selectinload(models.User.education),
            selectinload(models.User.certificates),
        )
        .where(models.User.id == current_user.id)  # type: ignore
    )  # type: ignore
    user_with_details = result.scalars().first()

    log.warning(f"User with skills: {user_with_details.__dict__['skills']}")

    if not user_with_details:
        raise HTTPException(status_code=404, detail="User not found")

    return schemas.UserProfileRead.from_orm(user_with_details)


@router.patch("/me/placement", response_model=schemas.UserRead)
async def update_placement(
    payload: schemas.PlacementUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: models.User = Depends(get_current_user),
):
    """Update the current user's placement status.

    Valid transitions: active → graduated, graduated → alumni.
    """
    current = schemas.PlacementStatus(current_user.placement_status)
    target = payload.placement_status

    valid_transitions = {
        schemas.PlacementStatus.ACTIVE: {schemas.PlacementStatus.GRADUATED},
        schemas.PlacementStatus.GRADUATED: {schemas.PlacementStatus.ALUMNI},
        schemas.PlacementStatus.ALUMNI: set(),
    }

    if target not in valid_transitions.get(current, set()):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {current.value} to {target.value}",
        )

    current_user.placement_status = target.value  # type: ignore
    if target in (schemas.PlacementStatus.GRADUATED, schemas.PlacementStatus.ALUMNI):
        current_user.placement_date = now_utc_naive()  # type: ignore

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


# ── Extractor definitions for each profile section ──────────────────────

_SECTION_EXTRACTORS = {
    "user_profile": {
        "description": "Extract personal/contact information from a profile or resume",
        "instruction": (
            "Extract the person's core contact and identity fields as JSON. "
            "Only include fields you can confidently identify. "
            "If the input contains '## Profile' or '## About' section headers, "
            "prefer those sections for identity fields."
        ),
        "json_schema": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "phone_number": {"type": "string"},
                "address_line_1": {"type": "string"},
                "address_line_2": {"type": "string"},
                "city": {"type": "string"},
                "state": {"type": "string"},
                "zip_code": {"type": "string"},
                "country": {"type": "string"},
                "time_zone": {"type": "string"},
            },
        },
    },
    "skills": {
        "description": "Skill data extractor",
        "instruction": (
            "Extract skills JSON data from a given context. "
            "If the input contains a '## Skills' section, "
            "prioritise skills listed there."
        ),
        "json_schema": schemas.SkillCreate.model_json_schema(),
    },
    "experiences": {
        "description": "Experience data extractor",
        "instruction": (
            "Extract experiences JSON data from a given context. "
            "If the input contains a '## Experience' section, "
            "focus on entries listed there."
        ),
        "json_schema": schemas.ExperienceCreate.model_json_schema(),
    },
    "education": {
        "description": "Education data extractor",
        "instruction": (
            "Extract education JSON data from a given context. "
            "If the input contains a '## Education' section, "
            "focus on entries listed there."
        ),
        "json_schema": schemas.EducationCreate.model_json_schema(),
    },
    "certificates": {
        "description": "Certificate data extractor",
        "instruction": (
            "Extract certificate JSON data from a given context. "
            "If the input contains a '## Certifications' section, "
            "focus on entries listed there."
        ),
        "json_schema": schemas.CertificateCreate.model_json_schema(),
    },
}


async def _get_or_create_extractor(
    name: str,
    db: AsyncSession,
    user: schemas.UserRead,
) -> models.Extractor:
    """Return the named extractor, creating it from _SECTION_EXTRACTORS if absent."""
    try:
        return await get_extractor_by_name(name, db)
    except HTTPException as e:
        if e.status_code != 404:
            raise
    defn = _SECTION_EXTRACTORS[name]
    return await create_extractor(
        schemas.ExtractorCreate(
            name=name,
            description=defn["description"],
            instruction=defn["instruction"],
            json_schema=defn["json_schema"],
            extractor_examples=[],
        ),
        db=db,
        user=user,
    )


async def _resolve_source_text(
    source: schemas.ProfileExtractSource,
) -> str:
    """Resolve a single ProfileExtractSource to plain text."""
    if source.text:
        return source.text
    if source.url:
        try:
            return await extract_text_from_url_smart(str(source.url))
        except UnsafeFetchUrlError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    if source.file:
        documents = parse_binary_input(
            source.file.file,
            file_name=source.file.filename,
            content_type=source.file.content_type,
        )
        return "\n".join(doc.page_content for doc in documents)
    raise HTTPException(
        status_code=400,
        detail="Each source must provide text, url, or file.",
    )


async def _extract_text_from_payload(
    payload: schemas.ExtractorRun,
) -> str:
    """Resolve the submitted source into plain text exactly once."""
    if payload.text:
        return payload.text
    if payload.url:
        try:
            return await extract_text_from_url_smart(str(payload.url))
        except UnsafeFetchUrlError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    if payload.file:
        documents = parse_binary_input(
            payload.file.file,
            file_name=payload.file.filename,
            content_type=payload.file.content_type,
        )
        return "\n".join(doc.page_content for doc in documents)
    raise HTTPException(
        status_code=400,
        detail="Provide text, url, or file.",
    )


@router.post("/me/profile/extract", response_model=schemas.ProfileExtractResponse)
async def extract_user_profile(
    payload: schemas.ExtractorRun = Depends(get_profile_extract_payload),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> schemas.ProfileExtractResponse:
    """Extract all profile sections from one or many sources and persist results."""

    # 1. Resolve source texts ──────────────────────────────────────────
    if payload.sources:
        source_texts = await gather(*[_resolve_source_text(s) for s in payload.sources])
        sources_count = len(source_texts)
    else:
        source_texts = [await _extract_text_from_payload(payload)]
        sources_count = 1

    # A single AsyncSession cannot safely service concurrent commit/refresh work.
    # Keep URL/file text resolution concurrent, but serialize all DB-backed steps.

    # 2. Get-or-create all section extractors
    section_names = list(_SECTION_EXTRACTORS.keys())
    extractor_map: dict[str, models.Extractor] = {}
    for name in section_names:
        extractor_map[name] = await _get_or_create_extractor(name, db, user)

    # 3. Run extractors against every source ───────────────────────────
    async def _run_one_source(text: str) -> dict[str, schemas.ExtractorResponse]:
        text_payload = schemas.ExtractorRun(
            mode=payload.mode, text=text, llm=payload.llm
        )
        results: dict[str, schemas.ExtractorResponse] = {}
        for name in section_names:
            results[name] = await run_extractor(
                schemas.ExtractorRead(**extractor_map[name].__dict__),
                text_payload,
                user,
                db,
            )
        return results

    all_result_maps: list[dict[str, schemas.ExtractorResponse]] = []
    for source_text in source_texts:
        all_result_maps.append(await _run_one_source(source_text))

    # 4. Merge + deduplicate across sources ────────────────────────────
    content_too_long = False
    merged_user: dict = {}
    merged_skills: list[dict] = []
    merged_experiences: list[dict] = []
    merged_education: list[dict] = []
    merged_certificates: list[dict] = []

    _seen_skills: set[str] = set()
    _seen_experiences: set[tuple] = set()
    _seen_education: set[tuple] = set()

    for rmap in all_result_maps:
        if any(r.content_too_long for r in rmap.values()):
            content_too_long = True

        # User fields — later sources override earlier ones
        for item in rmap["user_profile"].data:
            if isinstance(item, dict):
                merged_user.update({k: v for k, v in item.items() if v})

        # Skills — deduplicate by name (case-insensitive)
        for s in rmap["skills"].data:
            key = (s.get("name") or "").strip().lower()
            if key and key not in _seen_skills:
                _seen_skills.add(key)
                merged_skills.append(s)

        # Experiences — deduplicate by (company, title)
        for e in rmap["experiences"].data:
            key = (
                (e.get("company") or "").strip().lower(),
                (e.get("position") or e.get("title") or "").strip().lower(),
            )
            if key != ("", "") and key not in _seen_experiences:
                _seen_experiences.add(key)
                merged_experiences.append(e)
            elif key == ("", ""):
                merged_experiences.append(e)

        # Education — deduplicate by (institution, degree)
        for ed in rmap["education"].data:
            key = (
                (ed.get("institution") or "").strip().lower(),
                (ed.get("degree") or "").strip().lower(),
            )
            if key != ("", "") and key not in _seen_education:
                _seen_education.add(key)
                merged_education.append(ed)
            elif key == ("", ""):
                merged_education.append(ed)

        # Certificates — no dedup (names are rarely exact duplicates)
        merged_certificates.extend(rmap["certificates"].data)

    # 5. Persist extracted data ────────────────────────────────────────

    # 5a. Core user fields — patch only non-empty extracted values
    if merged_user:
        db_user = await db.get(models.User, user.id)
        if db_user:
            for key, value in merged_user.items():
                if hasattr(db_user, key):
                    setattr(db_user, key, value)
            await db.commit()
            await db.refresh(db_user)

    # 5b. Skills
    created_skills = []
    for skill_payload in merged_skills:
        created_skills.append(
            await create_skill(schemas.SkillCreate(**skill_payload), db=db, user=user)
        )

    # 5c. Experiences
    created_experiences = []
    for experience_payload in merged_experiences:
        created_experiences.append(
            await create_experience(
                schemas.ExperienceCreate(**experience_payload),
                db=db,
                user=user,
            )
        )

    # 5d. Education
    created_education = []
    for education_payload in merged_education:
        created_education.append(
            await create_education(
                schemas.EducationCreate(**education_payload),
                db=db,
                user=user,
            )
        )

    # 5e. Certificates
    created_certificates = []
    for certificate_payload in merged_certificates:
        created_certificates.append(
            await create_certificate(
                schemas.CertificateCreate(**certificate_payload),
                db=db,
                user=user,
            )
        )

    return schemas.ProfileExtractResponse(
        user=merged_user,
        skills=created_skills,
        experiences=created_experiences,
        education=created_education,
        certificates=created_certificates,
        content_too_long=content_too_long,
        sources_count=sources_count,
    )


@router.post("/seed", response_model=str)
async def seed_users(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_superuser),
) -> str:
    seed_path = conf.settings.SEEDS_PATH / "users.json"
    log.info(f"Seeding Users table with initial data from {seed_path}")
    # fetch orchestration pipeline, create a new one if not found
    try:
        pipeline = await get_orchestration_pipeline_by_name("seed_users", db, user)
    except HTTPException as e:
        if e.status_code == 404:
            log.warning("Seed Users pipeline not found, creating a new one")
            pipeline = await create_orchestration_pipeline(
                schemas.OrchestrationPipelineCreate(
                    name="seed_users",
                    description="Seed Users table with initial data",
                    definition={"action": "Insert initial data into Users table"},
                ),
                user,
                db,
            )
        else:
            raise e
    # create orchestration event
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message="Seeding Users table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,  # type: ignore
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={},
            source_uri=schemas.URI(name=str(seed_path), type=schemas.URIType.FILE),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#users",
                type=schemas.URIType.DATABASE,
            ),
        ),
        db=db,
    )
    log.info(f"Orchestration event {event.id} created for seeding Users table")
    # Run the event (TODO: move to background_task)
    try:
        async with aopen(seed_path, "r") as f:
            users = json.loads(await f.read())
        for user in users:
            await create_user(schemas.UserCreate(**user))  # type: ignore
    except Exception as e:
        log.error(f"Error seeding Users table: {e}")
        setattr(event, "status", schemas.OrchestrationEventStatusType.FAILED)
        setattr(event, "message", str(e))
        await db.commit()
        raise e
    setattr(event, "status", schemas.OrchestrationEventStatusType.SUCCESS)
    await db.commit()
    log.info(f"Seeded Users table with {len(users)} records.")
    return f"Seeded Users table with {len(users)} records."
