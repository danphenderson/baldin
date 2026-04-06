# Path: app/api/routes/leads.py

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import selectinload

from app import utils
from app.api.deps import (
    AsyncSession,
    create_extractor,
    create_lead,
    get_async_session,
    get_current_superuser,
    get_current_user,
    get_extractor_by_name,
    get_lead,
    get_mutable_lead,
    get_pagination_params,
    logging,
    models,
    run_extractor,
    schemas,
)
from app.api.routes.seed_tasks import SeedOperation, schedule_seed_operation
from app.core.db import session_context
from app.core.url_safety import validate_url_safe_for_fetch

logger = logging.get_logger(__name__)

router: APIRouter = APIRouter()


async def _create_seed_lead(
    record: dict[str, object],
    db: AsyncSession,
    user: models.User,
):
    seed_payload = {
        key: value
        for key, value in record.items()
        if key not in {"company", "industries", "notes"}
    }
    return await create_lead(schemas.LeadCreate(**seed_payload), db=db, user=user)


LEAD_SEED_OPERATION = SeedOperation(
    pipeline_name="seed_leads",
    resource_name="Leads",
    seed_filename="leads.json",
    destination_table="leads",
    creator=_create_seed_lead,
)


def _get_viewer_registration(
    lead: models.Lead, user_id: UUID4
) -> models.LeadRegistration | None:
    return next(
        (
            registration
            for registration in getattr(lead, "registrations", [])
            if registration.user_id == user_id
        ),
        None,
    )


def _build_viewer_permissions(
    user: schemas.UserRead, registration: models.LeadRegistration | None
) -> schemas.LeadViewerPermissionsRead:
    is_registered = registration is not None
    is_superuser = bool(getattr(user, "is_superuser", False))
    return schemas.LeadViewerPermissionsRead(
        can_register=not is_registered,
        can_leave_registration=is_registered,
        can_update_registration=is_registered,
        can_update_shared_fields=is_superuser or is_registered,
        can_clear_or_overwrite_shared_fields=is_superuser,
        can_delete_shared_lead=is_superuser,
        can_view_comments=is_registered,
        can_post_comments=is_registered,
    )


def _serialize_public_profile(
    user: models.User,
) -> schemas.LeadParticipantPublicProfileRead:
    return schemas.LeadParticipantPublicProfileRead(
        user_id=user.id,
        display_name=utils.build_user_display_name(user),
        city=user.city,
        state=user.state,
        country=user.country,
        avatar_uri=user.avatar_uri,
    )


def _serialize_registration(
    registration: models.LeadRegistration,
) -> schemas.LeadRegistrationRead:
    return schemas.LeadRegistrationRead(
        lead_id=registration.lead_id,
        user_id=registration.user_id,
        internal_notes=registration.internal_notes,
        expose_profile=registration.expose_profile,
        created_at=registration.created_at,
        updated_at=registration.updated_at,
    )


def _serialize_participant_summary(
    registration: models.LeadRegistration,
    viewer_connections: dict[UUID4, UUID4] | None = None,
) -> schemas.LeadParticipantSummaryRead:
    if registration.user is None:
        raise HTTPException(
            status_code=500,
            detail="Lead registration is missing the associated user",
        )
    is_connected = False
    connection_id = None
    if viewer_connections and registration.user_id in viewer_connections:
        is_connected = True
        connection_id = viewer_connections[registration.user_id]
    return schemas.LeadParticipantSummaryRead(
        registered_at=registration.created_at,
        public_profile=_serialize_public_profile(registration.user),
        is_connected=is_connected,
        connection_id=connection_id,
    )


def _serialize_comment(comment: models.LeadComment) -> schemas.LeadCommentRead:
    author_profile = None
    if not comment.anonymous and comment.author is not None:
        author_profile = _serialize_public_profile(comment.author)

    replies = []
    if comment.parent_comment_id is None:
        replies = sorted(comment.replies or [], key=lambda reply: reply.created_at)
    return schemas.LeadCommentRead(
        id=comment.id,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        lead_id=comment.lead_id,
        parent_comment_id=comment.parent_comment_id,
        content=comment.content,
        anonymous=comment.anonymous,
        author_public_profile=author_profile,
        replies=[_serialize_comment(reply) for reply in replies],
    )


def _serialize_lead(lead: models.Lead, user: schemas.UserRead) -> schemas.LeadRead:
    viewer_registration = _get_viewer_registration(lead, user.id)
    return schemas.LeadRead(
        id=lead.id,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        url=lead.url,
        canonical_url=lead.canonical_url,
        title=lead.title,
        description=lead.description,
        location=lead.location,
        salary=lead.salary,
        job_function=lead.job_function,
        employment_type=lead.employment_type,
        seniority_level=lead.seniority_level,
        education_level=lead.education_level,
        hiring_manager=lead.hiring_manager,
        companies=[
            schemas.CompanyRead.model_validate(company) for company in lead.companies
        ],
        interest_count=len(lead.registrations),
        comment_count=len(lead.comments),
        viewer_is_registered=viewer_registration is not None,
        viewer_permissions=_build_viewer_permissions(user, viewer_registration),
    )


async def _build_lead_read_response(
    lead_id: UUID4, user: schemas.UserRead, db: AsyncSession
) -> schemas.LeadRead:
    lead = await db.get(models.Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail=f"Lead not found: {lead_id}")

    companies_result = await db.execute(
        select(models.Company)
        .join(
            models.LeadXCompany,
            models.LeadXCompany.company_id == models.Company.id,
        )
        .where(models.LeadXCompany.lead_id == lead_id)
        .order_by(models.Company.created_at.asc())
    )
    companies = companies_result.scalars().unique().all()

    registrations_result = await db.execute(
        select(models.LeadRegistration).where(
            models.LeadRegistration.lead_id == lead_id
        )
    )
    registrations = registrations_result.scalars().all()
    viewer_registration = next(
        (
            registration
            for registration in registrations
            if registration.user_id == user.id
        ),
        None,
    )

    comment_count_result = await db.execute(
        select(func.count(models.LeadComment.id)).where(
            models.LeadComment.lead_id == lead_id
        )
    )
    comment_count = int(comment_count_result.scalar() or 0)

    return schemas.LeadRead(
        id=lead.id,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        url=lead.url,
        canonical_url=lead.canonical_url,
        title=lead.title,
        description=lead.description,
        location=lead.location,
        salary=lead.salary,
        job_function=lead.job_function,
        employment_type=lead.employment_type,
        seniority_level=lead.seniority_level,
        education_level=lead.education_level,
        hiring_manager=lead.hiring_manager,
        companies=[
            schemas.CompanyRead.model_validate(company) for company in companies
        ],
        interest_count=len(registrations),
        comment_count=comment_count,
        viewer_is_registered=viewer_registration is not None,
        viewer_permissions=_build_viewer_permissions(user, viewer_registration),
    )


def _serialize_lead_detail(
    lead: models.Lead,
    user: schemas.UserRead,
    viewer_connections: dict[UUID4, UUID4] | None = None,
) -> schemas.LeadDetailRead:
    lead_read = _serialize_lead(lead, user)
    viewer_registration = _get_viewer_registration(lead, user.id)
    participant_summaries = [
        _serialize_participant_summary(registration, viewer_connections)
        for registration in sorted(lead.registrations, key=lambda item: item.created_at)
        if registration.expose_profile and registration.user is not None
    ]
    return schemas.LeadDetailRead(
        **lead_read.model_dump(),
        viewer_registration=(
            _serialize_registration(viewer_registration)
            if viewer_registration is not None
            else None
        ),
        participant_summaries=participant_summaries,
    )


def _shared_value_is_empty(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


async def _update_lead_companies(
    lead: models.Lead,
    company_ids: list[UUID4] | None,
    db: AsyncSession,
    *,
    replace: bool,
) -> bool:
    if company_ids is None:
        return False

    existing_company_ids_result = await db.execute(
        select(models.LeadXCompany.company_id).where(
            models.LeadXCompany.lead_id == lead.id
        )
    )
    existing_company_ids = set(existing_company_ids_result.scalars().all())

    valid_requested_ids: list[UUID4] = []
    seen_company_ids: set[UUID4] = set()
    for company_id in company_ids:
        if company_id in seen_company_ids:
            continue
        seen_company_ids.add(company_id)
        company = await db.get(models.Company, company_id)
        if company is not None:
            valid_requested_ids.append(company_id)

    requested_company_ids = set(valid_requested_ids)

    if replace:
        company_ids_to_remove = existing_company_ids - requested_company_ids
        company_ids_to_add = requested_company_ids - existing_company_ids

        if company_ids_to_remove:
            await db.execute(
                delete(models.LeadXCompany).where(
                    models.LeadXCompany.lead_id == lead.id,
                    models.LeadXCompany.company_id.in_(company_ids_to_remove),
                )
            )

        for company_id in valid_requested_ids:
            if company_id not in company_ids_to_add:
                continue
            db.add(models.LeadXCompany(lead_id=lead.id, company_id=company_id))

        return bool(company_ids_to_remove or company_ids_to_add)

    company_ids_to_add = requested_company_ids - existing_company_ids
    for company_id in valid_requested_ids:
        if company_id not in company_ids_to_add:
            continue
        db.add(models.LeadXCompany(lead_id=lead.id, company_id=company_id))

    return bool(company_ids_to_add)


def _require_registered_viewer(
    lead: models.Lead, user: schemas.UserRead
) -> models.LeadRegistration:
    registration = _get_viewer_registration(lead, user.id)
    if registration is None:
        raise HTTPException(
            status_code=403,
            detail="Lead comments and registration metadata are only available to registered viewers",
        )
    return registration


async def _get_comment_with_context(
    comment_id: UUID4, db: AsyncSession
) -> models.LeadComment | None:
    result = await db.execute(
        select(models.LeadComment)
        .options(
            selectinload(models.LeadComment.author),
            selectinload(models.LeadComment.replies).selectinload(
                models.LeadComment.author
            ),
        )
        .where(models.LeadComment.id == comment_id)
    )
    return result.scalars().unique().first()


@router.post("/", status_code=201, response_model=schemas.LeadRead)
async def create_job_lead(
    payload: schemas.LeadCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    result = await create_lead(payload, db=db, user=user)
    async with session_context() as refresh_session:
        return await _build_lead_read_response(result.lead.id, user, refresh_session)


@router.post("/extract", response_model=schemas.LeadExtractResponse)
async def extract_lead(
    extraction_url: str,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    submitted_url = extraction_url.strip()
    logger.info(f"User {user.id} triggered lead extraction for {submitted_url}")
    try:
        utils.canonicalize_lead_url(submitted_url)
        validate_url_safe_for_fetch(submitted_url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        extractor = await get_extractor_by_name("lead", db)
    except HTTPException as exc:
        if exc.status_code != 404:
            raise exc
        extractor = await create_extractor(
            schemas.ExtractorCreate(
                name="lead",
                description="Extract lead data from URL",
                instruction="Extract lead information from the given URL",
                json_schema=schemas.LeadCreate.model_json_schema(),
                extractor_examples=[],
            ),
            user,
            db,
        )

    payload = schemas.ExtractorRun(
        mode="entire_document",
        file=None,
        text=None,
        url=submitted_url,
        llm=None,
    )
    result = await run_extractor(
        schemas.ExtractorRead(**extractor.__dict__), payload, user, db
    )

    if not result.data:
        raise HTTPException(status_code=502, detail="Extractor returned no lead data")

    extracted_payload = dict(result.data[0])
    company_ids = extracted_payload.pop("company_ids", None)
    extracted_payload["url"] = submitted_url

    try:
        lead_result = await create_lead(
            schemas.LeadCreate(**extracted_payload, company_ids=company_ids),
            db=db,
            user=user,
        )
    except Exception as exc:
        logger.error(f"Error saving extracted lead: {exc}")
        raise HTTPException(
            status_code=500, detail="Error saving lead to database"
        ) from exc

    return schemas.LeadExtractResponse(
        lead=await _build_lead_read_response(lead_result.lead.id, user, db),
        disposition=lead_result.disposition,
        submitted_url=submitted_url,
        normalized_url=lead_result.normalized_url,
    )


@router.get("/", response_model=schemas.LeadsPaginatedRead)
async def read_leads(
    db: AsyncSession = Depends(get_async_session),
    pagination: schemas.Pagination = Depends(get_pagination_params),
    user: schemas.UserRead = Depends(get_current_user),
):
    offset = (pagination.page - 1) * pagination.page_size
    lead_query = (
        select(models.Lead)
        .options(
            selectinload(models.Lead.companies),
            selectinload(models.Lead.registrations).selectinload(
                models.LeadRegistration.user
            ),
            selectinload(models.Lead.comments),
        )
        .order_by(models.Lead.created_at.desc())
        .offset(offset)
        .limit(pagination.page_size)
    )
    total_count_query = select(func.count(models.Lead.id)).select_from(models.Lead)

    leads = await db.execute(lead_query)
    lead_list = leads.scalars().unique().all()
    total_count_result = await db.execute(total_count_query)
    total_count = total_count_result.scalar_one()

    return schemas.LeadsPaginatedRead(
        leads=[_serialize_lead(lead, user) for lead in lead_list],
        pagination=pagination,
        total_count=total_count,
    )


async def _get_viewer_accepted_connections(
    viewer_id: UUID4, db: AsyncSession
) -> dict[UUID4, UUID4]:
    """Return a mapping of {other_user_id: connection_id} for accepted connections."""
    result = await db.execute(
        select(models.Connection).where(
            models.Connection.status == "accepted",
            or_(
                models.Connection.requester_id == viewer_id,
                models.Connection.addressee_id == viewer_id,
            ),
        )
    )
    connections = result.scalars().all()
    lookup: dict[UUID4, UUID4] = {}
    for conn in connections:
        other = (
            conn.addressee_id if conn.requester_id == viewer_id else conn.requester_id
        )
        lookup[other] = conn.id
    return lookup


@router.get("/{id}", status_code=200, response_model=schemas.LeadDetailRead)
async def read_lead(
    lead: models.Lead = Depends(get_lead),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    viewer_connections = await _get_viewer_accepted_connections(user.id, db)
    return _serialize_lead_detail(lead, user, viewer_connections)


@router.patch("/{id}", status_code=200, response_model=schemas.LeadRead)
async def update_lead(
    payload: schemas.LeadSharedUpdate,
    lead: models.Lead = Depends(get_mutable_lead),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    changed = False
    is_superuser = bool(getattr(user, "is_superuser", False))

    for field, value in payload.model_dump(
        exclude_unset=True, exclude={"company_ids"}
    ).items():
        current_value = getattr(lead, field)
        if is_superuser:
            if current_value != value:
                setattr(lead, field, value)
                changed = True
            continue

        if value is None:
            if current_value is None:
                continue
            raise HTTPException(
                status_code=403,
                detail=f"Only superusers can clear populated field '{field}'",
            )

        if _shared_value_is_empty(current_value):
            if current_value != value:
                setattr(lead, field, value)
                changed = True
            continue

        if current_value != value:
            raise HTTPException(
                status_code=403,
                detail=f"Only superusers can overwrite populated field '{field}'",
            )

    if "company_ids" in payload.model_fields_set and await _update_lead_companies(
        lead,
        payload.company_ids or [],
        db,
        replace=is_superuser,
    ):
        changed = True

    if changed:
        await db.commit()

    async with session_context() as refresh_session:
        return await _build_lead_read_response(lead.id, user, refresh_session)


@router.post(
    "/{id}/registration", status_code=200, response_model=schemas.LeadRegistrationRead
)
async def create_lead_registration(
    lead: models.Lead = Depends(get_lead),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    registration = _get_viewer_registration(lead, user.id)
    if registration is None:
        current_user = await db.get(models.User, user.id)
        if current_user is None:
            raise HTTPException(status_code=404, detail=f"User not found: {user.id}")
        registration = models.LeadRegistration(user=current_user)
        lead.registrations.append(registration)
        await db.commit()
        await db.refresh(registration)

    return _serialize_registration(registration)


@router.patch(
    "/{id}/registration",
    status_code=200,
    response_model=schemas.LeadRegistrationRead,
)
async def update_lead_registration(
    payload: schemas.LeadRegistrationUpdate,
    lead: models.Lead = Depends(get_lead),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    registration = _require_registered_viewer(lead, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(registration, field, value)
    await db.commit()
    await db.refresh(registration)
    return _serialize_registration(registration)


@router.delete("/{id}/registration", status_code=204)
async def delete_lead_registration(
    lead: models.Lead = Depends(get_lead),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    registration = _require_registered_viewer(lead, user)
    await db.delete(registration)
    await db.commit()
    return None


@router.get("/{id}/comments", response_model=list[schemas.LeadCommentRead])
async def read_lead_comments(
    lead: models.Lead = Depends(get_lead),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    _require_registered_viewer(lead, user)
    result = await db.execute(
        select(models.LeadComment)
        .options(
            selectinload(models.LeadComment.author),
            selectinload(models.LeadComment.replies).selectinload(
                models.LeadComment.author
            ),
        )
        .where(
            models.LeadComment.lead_id == lead.id,
            models.LeadComment.parent_comment_id.is_(None),
        )
        .order_by(models.LeadComment.created_at.asc())
    )
    comments = result.scalars().unique().all()
    return [_serialize_comment(comment) for comment in comments]


@router.post("/{id}/comments", status_code=201, response_model=schemas.LeadCommentRead)
async def create_lead_comment(
    payload: schemas.LeadCommentCreate,
    lead: models.Lead = Depends(get_lead),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    _require_registered_viewer(lead, user)
    comment = models.LeadComment(
        lead_id=lead.id,
        author_user_id=user.id,
        content=payload.content,
        anonymous=payload.anonymous,
    )
    db.add(comment)
    await db.commit()
    stored_comment = await _get_comment_with_context(comment.id, db)
    if stored_comment is None:
        raise HTTPException(status_code=404, detail=f"Comment not found: {comment.id}")
    return _serialize_comment(stored_comment)


@router.post(
    "/{id}/comments/{comment_id}/replies",
    status_code=201,
    response_model=schemas.LeadCommentRead,
)
async def create_lead_comment_reply(
    payload: schemas.LeadCommentCreate,
    comment_id: UUID4,
    lead: models.Lead = Depends(get_lead),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    _require_registered_viewer(lead, user)
    parent_comment = await _get_comment_with_context(comment_id, db)
    if parent_comment is None or parent_comment.lead_id != lead.id:
        raise HTTPException(status_code=404, detail=f"Comment not found: {comment_id}")
    if parent_comment.parent_comment_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Replies can only be created for top-level comments",
        )

    reply = models.LeadComment(
        lead_id=lead.id,
        author_user_id=user.id,
        parent_comment_id=parent_comment.id,
        content=payload.content,
        anonymous=payload.anonymous,
    )
    db.add(reply)
    await db.commit()
    stored_reply = await _get_comment_with_context(reply.id, db)
    if stored_reply is None:
        raise HTTPException(status_code=404, detail=f"Comment not found: {reply.id}")
    return _serialize_comment(stored_reply)


@router.delete("/purge", status_code=202, response_model=dict)
async def purge_leads(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_superuser),
):
    del user
    lead_ids = select(models.Lead.id)
    application_ids = select(models.Application.id).where(
        models.Application.lead_id.in_(lead_ids)
    )

    await db.execute(
        delete(models.ResumeXApplication).where(
            models.ResumeXApplication.application_id.in_(application_ids)
        )
    )
    await db.execute(
        delete(models.CoverLetterXApplication).where(
            models.CoverLetterXApplication.application_id.in_(application_ids)
        )
    )
    await db.execute(
        delete(models.Application).where(models.Application.lead_id.in_(lead_ids))
    )
    await db.execute(delete(models.LeadComment))
    await db.execute(delete(models.LeadRegistration))
    await db.execute(delete(models.LeadXCompany))
    await db.execute(delete(models.Lead))
    await db.commit()
    return {"message": "All leads have been purged successfully"}


@router.delete("/{id}", status_code=204)
async def delete_lead(
    lead: models.Lead = Depends(get_lead),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_superuser),
):
    del user
    await db.delete(lead)
    await db.commit()
    return None


@router.post("/seed", status_code=202, response_model=schemas.SeedOperationAccepted)
async def seed_leads(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    return await schedule_seed_operation(
        background_tasks, db, user, LEAD_SEED_OPERATION
    )
