import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import (
    AsyncSession,
    get_agent,
    get_async_session,
    get_current_user,
    model_to_dict,
    models,
    schemas,
)
from app.api.routes.documents import (
    _load_document_blocks,
    _serialize_document_block_tree,
    create_document,
    create_version,
)
from app.core.langchain import generate_cover_letter

router: APIRouter = APIRouter()


def _json_dumps(data: Any) -> str:
    return json.dumps(data, default=str)


def _compact_error_summary(detail: Any, *, max_length: int = 500) -> str:
    if isinstance(detail, str):
        message = detail
    else:
        message = _json_dumps(detail)
    return message[:max_length]


def _inline_content_from_text(text: str) -> list[dict[str, Any]]:
    stripped = text.strip()
    if not stripped:
        return []

    content: list[dict[str, Any]] = []
    parts = stripped.split("\n")
    for index, part in enumerate(parts):
        if part:
            content.append({"type": "text", "text": part})
        if index < len(parts) - 1:
            content.append({"type": "hardBreak"})
    return content


def _section_attrs(run_id: str, section: str, **extra: Any) -> dict[str, Any]:
    attrs = {
        "agent_run_id": run_id,
        "agent_section": section,
    }
    attrs.update(extra)
    return attrs


def _heading_node(
    text: str,
    *,
    level: int,
    run_id: str,
    section: str,
) -> dict[str, Any]:
    node: dict[str, Any] = {
        "type": "heading",
        "attrs": _section_attrs(run_id, section, level=level),
    }
    inline_content = _inline_content_from_text(text)
    if inline_content:
        node["content"] = inline_content
    return node


def _paragraph_node(
    text: str,
    *,
    run_id: str,
    section: str,
) -> dict[str, Any]:
    node: dict[str, Any] = {
        "type": "paragraph",
        "attrs": _section_attrs(run_id, section),
    }
    inline_content = _inline_content_from_text(text)
    if inline_content:
        node["content"] = inline_content
    return node


def _callout_node(
    text: str,
    *,
    run_id: str,
    section: str,
    callout_type: str = "info",
) -> dict[str, Any]:
    paragraph: dict[str, Any] = {"type": "paragraph"}
    inline_content = _inline_content_from_text(text)
    if inline_content:
        paragraph["content"] = inline_content
    return {
        "type": "callout",
        "attrs": _section_attrs(run_id, section, callout_type=callout_type),
        "content": [paragraph],
    }


def _task_item_node(
    text: str,
    *,
    run_id: str,
    section: str,
    checked: bool = False,
) -> dict[str, Any]:
    paragraph: dict[str, Any] = {"type": "paragraph"}
    inline_content = _inline_content_from_text(text)
    if inline_content:
        paragraph["content"] = inline_content
    return {
        "type": "taskItem",
        "attrs": _section_attrs(run_id, section, checked=checked),
        "content": [paragraph],
    }


def _task_list_node(
    items: list[str],
    *,
    run_id: str,
    section: str,
) -> dict[str, Any]:
    return {
        "type": "taskList",
        "attrs": _section_attrs(run_id, section),
        "content": [
            _task_item_node(item, run_id=run_id, section=section) for item in items
        ],
    }


def _table_cell_node(
    text: str,
    *,
    run_id: str,
    section: str,
    header: bool = False,
) -> dict[str, Any]:
    paragraph: dict[str, Any] = {"type": "paragraph"}
    inline_content = _inline_content_from_text(text)
    if inline_content:
        paragraph["content"] = inline_content
    return {
        "type": "tableHeader" if header else "tableCell",
        "attrs": _section_attrs(run_id, section),
        "content": [paragraph],
    }


def _table_node(
    rows: list[tuple[str, str]],
    *,
    run_id: str,
    section: str,
) -> dict[str, Any]:
    return {
        "type": "table",
        "attrs": _section_attrs(run_id, section),
        "content": [
            {
                "type": "tableRow",
                "attrs": _section_attrs(run_id, section),
                "content": [
                    _table_cell_node(
                        label, run_id=run_id, section=section, header=True
                    ),
                    _table_cell_node(value, run_id=run_id, section=section),
                ],
            }
            for label, value in rows
        ],
    }


def _build_agent_session_tiptap(
    *,
    agent: models.Agent,
    application: models.Application,
    draft_text: str,
    run_id: str,
    pinned_resume_title: str | None,
) -> str:
    lead = application.lead
    company_names = ", ".join(
        company.name
        for company in getattr(lead, "companies", [])
        if getattr(company, "name", None)
    )

    task_items = [
        "Review the generated draft against your pinned resume.",
        f"Verify role details for {lead.title or 'this application'} before sending.",
        (
            f"Complete next step: {application.next_step}"
            if application.next_step
            else "Choose and complete the next application step."
        ),
    ]

    tiptap_json = {
        "type": "doc",
        "content": [
            _heading_node(
                f"{agent.name} Workspace: {lead.title or 'Application'}",
                level=1,
                run_id=run_id,
                section="title",
            ),
            _callout_node(
                agent.instructions
                or "Structured workspace generated from application context.",
                run_id=run_id,
                section="overview",
                callout_type="info",
            ),
            _table_node(
                [
                    ("Role", lead.title or ""),
                    ("Companies", company_names),
                    (
                        "Stage",
                        getattr(application.stage, "value", str(application.stage)),
                    ),
                    ("Pinned Resume", pinned_resume_title or "None pinned"),
                ],
                run_id=run_id,
                section="application_context",
            ),
            _heading_node(
                "Generated Draft",
                level=2,
                run_id=run_id,
                section="draft_heading",
            ),
            _paragraph_node(
                draft_text,
                run_id=run_id,
                section="draft",
            ),
            _heading_node(
                "Next Steps",
                level=2,
                run_id=run_id,
                section="next_steps_heading",
            ),
            _task_list_node(
                task_items,
                run_id=run_id,
                section="next_steps",
            ),
        ],
    }
    return _json_dumps(tiptap_json)


async def _load_application_for_run(
    db: AsyncSession,
    *,
    application_id,
    user_id,
) -> models.Application:
    result = await db.execute(
        select(models.Application)
        .options(
            selectinload(models.Application.lead).selectinload(models.Lead.companies)
        )
        .where(models.Application.id == application_id)
    )
    application = result.scalars().unique().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to run this agent for the application",
        )
    return application


async def _load_user_profile_for_run(
    db: AsyncSession,
    *,
    user_id,
) -> models.User:
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.skills),
            selectinload(models.User.experiences),
            selectinload(models.User.education),
            selectinload(models.User.certificates),
        )
        .where(models.User.id == user_id)
    )
    user_profile = result.scalars().unique().first()
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return user_profile


async def _load_pinned_resume_for_run(
    db: AsyncSession,
    *,
    user_id,
) -> models.Document | None:
    result = await db.execute(
        select(models.Document)
        .options(selectinload(models.Document.head_version))
        .where(
            models.Document.user_id == user_id,
            models.Document.kind == schemas.DocumentKind.RESUME.value,
            models.Document.is_pinned.is_(True),
        )
        .order_by(
            desc(models.Document.updated_at),
            desc(models.Document.created_at),
            desc(models.Document.id),
        )
        .limit(1)
    )
    return result.scalars().first()


async def _load_session_document_for_run(
    db: AsyncSession,
    *,
    session_document_id,
    user_id,
) -> tuple[models.Document, list[dict[str, Any]]]:
    result = await db.execute(
        select(models.Document)
        .options(selectinload(models.Document.head_version))
        .where(models.Document.id == session_document_id)
    )
    document = result.scalars().first()
    if not document:
        raise HTTPException(status_code=404, detail="Session document not found")
    if document.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to run this agent in the session",
        )
    if document.kind != schemas.DocumentKind.CELL_DOC.value:
        raise HTTPException(
            status_code=400,
            detail="Agent sessions can only be rerun into cell_doc documents",
        )

    live_blocks = await _load_document_blocks(db, document_id=document.id)
    live_block_tree = [
        block.model_dump(mode="json")
        for block in _serialize_document_block_tree(live_blocks)
    ]
    return document, live_block_tree


async def _find_parent_run_id(
    db: AsyncSession,
    *,
    agent_id,
    session_document_id,
):
    result = await db.execute(
        select(models.AgentRun.id)
        .where(
            models.AgentRun.agent_id == agent_id,
            models.AgentRun.session_document_id == session_document_id,
        )
        .order_by(
            desc(models.AgentRun.created_at),
            desc(models.AgentRun.id),
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


def _serialize_user_profile(user_profile: models.User) -> dict[str, Any]:
    return {
        **(model_to_dict(user_profile) or {}),
        "skills": [model_to_dict(skill) for skill in user_profile.skills],
        "experiences": [
            model_to_dict(experience) for experience in user_profile.experiences
        ],
        "education": [model_to_dict(education) for education in user_profile.education],
        "certificates": [
            model_to_dict(certificate) for certificate in user_profile.certificates
        ],
    }


def _serialize_lead(lead: models.Lead) -> dict[str, Any]:
    return {
        **(model_to_dict(lead) or {}),
        "companies": [
            model_to_dict(company) for company in getattr(lead, "companies", [])
        ],
    }


def _serialize_pinned_resume(document: models.Document | None) -> dict[str, Any] | None:
    if document is None:
        return None

    head_version = document.head_version
    return {
        "document_id": str(document.id),
        "title": document.title,
        "head_version_id": str(head_version.id) if head_version else None,
        "content": head_version.content
        if head_version and head_version.content
        else "",
    }


def _serialize_session_context(
    document: models.Document | None,
    live_block_tree: list[dict[str, Any]] | None,
) -> dict[str, Any] | None:
    if document is None:
        return None

    head_version = document.head_version
    return {
        "document_id": str(document.id),
        "title": document.title,
        "head_version": {
            "id": str(head_version.id) if head_version else None,
            "version_number": head_version.version_number if head_version else None,
            "content": head_version.content
            if head_version and head_version.content
            else "",
            "content_format": head_version.content_format if head_version else None,
        },
        "live_block_tree": live_block_tree or [],
    }


def _build_agent_input_context(
    *,
    agent: models.Agent,
    application: models.Application,
    user_profile: models.User,
    pinned_resume: models.Document | None,
    session_document: models.Document | None,
    live_block_tree: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    return {
        "agent": {
            "id": str(agent.id),
            "name": agent.name,
            "kind": agent.kind,
            "instructions": agent.instructions,
        },
        "application": model_to_dict(application) or {},
        "lead": _serialize_lead(application.lead),
        "user_profile": _serialize_user_profile(user_profile),
        "pinned_resume": _serialize_pinned_resume(pinned_resume),
        "session": _serialize_session_context(session_document, live_block_tree),
    }


def _generate_cover_letter_draft(
    *,
    input_context: dict[str, Any],
) -> str:
    draft_text = generate_cover_letter(
        profile=_json_dumps(
            {
                **input_context["user_profile"],
                "pinned_resume": input_context.get("pinned_resume"),
            }
        ),
        job=_json_dumps(
            {
                "application": input_context["application"],
                "lead": input_context["lead"],
            }
        ),
        template=_json_dumps(
            {
                "instructions": input_context["agent"].get("instructions"),
                "existing_session": input_context.get("session"),
            }
        ),
    )
    if not draft_text or not draft_text.strip():
        raise ValueError("Agent generated an empty draft")
    return draft_text.strip()


async def _upsert_application_session_link(
    db: AsyncSession,
    *,
    application_id,
    document_id,
    version_id,
) -> None:
    result = await db.execute(
        select(models.DocumentXApplication).where(
            models.DocumentXApplication.application_id == application_id,
            models.DocumentXApplication.document_id == document_id,
        )
    )
    assoc = result.scalars().first()
    if assoc is None:
        db.add(
            models.DocumentXApplication(
                application_id=application_id,
                document_id=document_id,
                version_id=version_id,
            )
        )
        return

    assoc.version_id = version_id


async def _load_agent_run(
    db: AsyncSession,
    *,
    run_id,
) -> models.AgentRun:
    result = await db.execute(
        select(models.AgentRun)
        .options(
            selectinload(models.AgentRun.session_document),
            selectinload(models.AgentRun.session_version),
        )
        .where(models.AgentRun.id == run_id)
    )
    run = result.scalars().first()
    if run is None:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return run


@router.get("/", response_model=schemas.PaginatedResponse[schemas.AgentSummaryRead])
async def list_agents(
    kind: schemas.AgentKind | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    base = select(models.Agent).where(models.Agent.user_id == user.id)

    if kind is not None:
        base = base.where(models.Agent.kind == kind.value)

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(
            desc(models.Agent.updated_at),
            desc(models.Agent.created_at),
            desc(models.Agent.id),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return schemas.PaginatedResponse[schemas.AgentSummaryRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/", status_code=201, response_model=schemas.AgentRead)
async def create_agent(
    payload: schemas.AgentCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    agent = models.Agent(
        **payload.model_dump(exclude_unset=True),
        user_id=user.id,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.get(
    "/runs",
    response_model=schemas.PaginatedResponse[schemas.AgentRunSummaryRead],
)
async def list_runs_by_session(
    session_document_id: UUID = Query(
        ..., description="Filter runs by the session document they produced"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    base = (
        select(models.AgentRun)
        .where(
            models.AgentRun.user_id == user.id,
            models.AgentRun.session_document_id == session_document_id,
        )
        .options(
            selectinload(models.AgentRun.session_document),
            selectinload(models.AgentRun.session_version),
        )
    )

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(
            desc(models.AgentRun.created_at),
            desc(models.AgentRun.id),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return schemas.PaginatedResponse[schemas.AgentRunSummaryRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{id}/run", status_code=201, response_model=schemas.AgentRunRead)
async def run_agent(
    payload: schemas.AgentRunExecuteRequest,
    agent: models.Agent = Depends(get_agent),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    if not agent.is_enabled:
        raise HTTPException(status_code=409, detail="Agent is disabled")

    application = await _load_application_for_run(
        db,
        application_id=payload.application_id,
        user_id=user.id,
    )
    user_profile = await _load_user_profile_for_run(db, user_id=user.id)
    pinned_resume = await _load_pinned_resume_for_run(db, user_id=user.id)

    session_document: models.Document | None = None
    live_block_tree: list[dict[str, Any]] | None = None
    parent_run_id = None

    if payload.session_document_id is not None:
        session_document, live_block_tree = await _load_session_document_for_run(
            db,
            session_document_id=payload.session_document_id,
            user_id=user.id,
        )
        parent_run_id = await _find_parent_run_id(
            db,
            agent_id=agent.id,
            session_document_id=session_document.id,
        )

    input_context = _build_agent_input_context(
        agent=agent,
        application=application,
        user_profile=user_profile,
        pinned_resume=pinned_resume,
        session_document=session_document,
        live_block_tree=live_block_tree,
    )

    run = models.AgentRun(
        agent_id=agent.id,
        user_id=user.id,
        application_id=application.id,
        parent_run_id=parent_run_id,
        trigger_kind=schemas.AgentRunTriggerKind.MANUAL.value,
        status=schemas.AgentRunStatus.RUNNING.value,
        input_context=input_context,
        session_document_id=session_document.id if session_document else None,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    run_id = run.id

    try:
        if agent.kind != schemas.AgentKind.COVER_LETTER.value:
            raise HTTPException(
                status_code=501,
                detail=f"Agent kind '{agent.kind}' is not yet supported for execution",
            )

        draft_text = _generate_cover_letter_draft(input_context=input_context)
        session_content = _build_agent_session_tiptap(
            agent=agent,
            application=application,
            draft_text=draft_text,
            run_id=str(run.id),
            pinned_resume_title=pinned_resume.title if pinned_resume else None,
        )

        if session_document is None:
            created_document = await create_document(
                payload=schemas.DocumentCreate(
                    kind=schemas.DocumentKind.CELL_DOC,
                    title=f"{agent.name} Workspace - {application.lead.title or 'Application'}",
                    status=schemas.DocumentStatus.DRAFT,
                    content=session_content,
                    content_type=schemas.ContentType.GENERATED,
                    content_format=schemas.ContentFormat.TIPTAP_JSON,
                ),
                user=user,
                db=db,
            )
            session_document_id = created_document.id

            persisted_document = await db.get(models.Document, session_document_id)
            if persisted_document is None or persisted_document.head_version_id is None:
                raise HTTPException(
                    status_code=409,
                    detail="Created session document is missing a head version",
                )
            session_version_id = persisted_document.head_version_id
        else:
            created_version = await create_version(
                document_id=session_document.id,
                payload=schemas.DocumentVersionCreate(
                    name=f"{agent.name} rerun",
                    content=session_content,
                    content_type=schemas.ContentType.GENERATED,
                    content_format=schemas.ContentFormat.TIPTAP_JSON,
                    change_summary=f"Agent rerun for application: {application.lead.title or 'Application'}",
                ),
                user=user,
                db=db,
            )
            session_document_id = session_document.id
            session_version_id = created_version.id

        await _upsert_application_session_link(
            db,
            application_id=application.id,
            document_id=session_document_id,
            version_id=session_version_id,
        )

        persisted_run = await db.get(models.AgentRun, run_id)
        if persisted_run is None:
            raise HTTPException(status_code=404, detail="Agent run not found")
        persisted_run.status = schemas.AgentRunStatus.COMPLETED.value
        persisted_run.session_document_id = session_document_id
        persisted_run.session_version_id = session_version_id
        persisted_run.error_summary = None
        persisted_run.completed_at = datetime.now(timezone.utc)
        await db.commit()
    except HTTPException as exc:
        await db.rollback()
        failed_run = await db.get(models.AgentRun, run_id)
        if failed_run is not None:
            failed_run.status = schemas.AgentRunStatus.FAILED.value
            failed_run.error_summary = _compact_error_summary(exc.detail)
            failed_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
        raise
    except Exception as exc:
        await db.rollback()
        failed_run = await db.get(models.AgentRun, run_id)
        if failed_run is not None:
            failed_run.status = schemas.AgentRunStatus.FAILED.value
            failed_run.error_summary = _compact_error_summary(str(exc))
            failed_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return await _load_agent_run(db, run_id=run_id)


@router.get(
    "/{id}/runs", response_model=schemas.PaginatedResponse[schemas.AgentRunSummaryRead]
)
async def get_agent_runs(
    agent: models.Agent = Depends(get_agent),
    db: AsyncSession = Depends(get_async_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    base = (
        select(models.AgentRun)
        .where(models.AgentRun.agent_id == agent.id)
        .options(
            selectinload(models.AgentRun.session_document),
            selectinload(models.AgentRun.session_version),
        )
    )

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(
            desc(models.AgentRun.created_at),
            desc(models.AgentRun.id),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return schemas.PaginatedResponse[schemas.AgentRunSummaryRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id}", response_model=schemas.AgentRead)
async def get_agent_detail(
    agent: models.Agent = Depends(get_agent),
):
    return agent


@router.patch("/{id}", response_model=schemas.AgentRead)
async def update_agent(
    payload: schemas.AgentUpdate,
    agent: models.Agent = Depends(get_agent),
    db: AsyncSession = Depends(get_async_session),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)

    await db.commit()
    await db.refresh(agent)
    return agent


@router.delete("/{id}", status_code=204, response_model=None)
async def delete_agent(
    agent: models.Agent = Depends(get_agent),
    db: AsyncSession = Depends(get_async_session),
):
    existing_run = await db.execute(
        select(models.AgentRun.id).where(models.AgentRun.agent_id == agent.id).limit(1)
    )
    if existing_run.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="Agent cannot be deleted after runs have been recorded",
        )

    await db.delete(agent)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Agent cannot be deleted after runs have been recorded",
        ) from exc

    return None
