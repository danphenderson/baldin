# app/api/routes/extractor.py
import json
from typing import Sequence

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from langchain_core.prompts import ChatPromptTemplate
from pydantic import UUID4, Field
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload, selectinload
from typing_extensions import TypedDict

from app.api.deps import (
    MAX_FILE_SIZE_MB,
    SUPPORTED_MIMETYPES,
    AsyncSession,
    console_log,
    get_async_session,
    get_current_user,
    get_extractor,
    get_extractor_example,
    get_extractor_run_payload,
    models,
    run_extractor,
    schemas,
)
from app.core import conf
from app.core.extractor_retry import rehydrate_extractor_run
from app.core.rate_limit import limiter

router: APIRouter = APIRouter()


class ConfigurationResponse(TypedDict):
    """Response for configuration."""

    available_models: list[str]
    accepted_mimetypes: list[str]
    max_file_size_mb: int
    max_concurrency: int
    max_chunks: int
    models: list[dict]


@router.get("/configurables", response_model=ConfigurationResponse)
def get_configuration(
    user: schemas.UserRead = Depends(get_current_user),
) -> ConfigurationResponse:
    """Endpoint to show server configuration."""
    res = {
        "available_models": sorted(conf.openai.SUPPORTED_MODELS),  # Deprecate
        "models": [
            {
                "name": model,
                "description": data["description"],
            }
            for model, data in conf.openai.SUPPORTED_MODELS.items()
        ],
        "accepted_mimetypes": SUPPORTED_MIMETYPES,
        "max_file_size_mb": MAX_FILE_SIZE_MB,
        "max_concurrency": conf.settings.MAX_CONCURRENCY,
        "max_chunks": conf.settings.MAX_CHUNKS,  # type: ignore
    }
    console_log.info("User %s requested configuration.", user.first_name)
    console_log.info(f"Returning configuration: {res}")
    return res  # type: ignore


class SuggestExtractor(schemas._BaseModel):
    """A request to create an extractor from a text sample."""

    description: str = Field("", description="A description of the extractor.")
    json_schema: str | None = Field(
        None,
        description="Existing JSON schema that describes the entity information that should be extracted.",
    )


class ExtractorDefinition(schemas._BaseModel):
    """Define an information extractor to be used in an information extraction system."""  # noqa: E501

    json_schema: str = Field(
        ...,
        description=(
            "JSON Schema that describes the entity / "
            "information that should be extracted. "
            "This schema is specified in JSON Schema format. "
        ),
    )


SUGGEST_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are are an expert ontologist and have been asked to help a user "
            "define an information extractor.The user will describe an entity, "
            "a topic or a piece of information that they would like to extract from "
            "text. Based on the user input, you are to provide a schema and "
            "description for the extractor. The schema should be a JSON Schema that "
            "describes the entity or information to be extracted. information to be "
            "extracted. Make sure to include title and description for all the "
            "attributes in the schema.The JSON Schema should describe a top level "
            "object. The object MUST have a title and description.Unless otherwise "
            "stated all entity properties in the schema should be considered optional.",
        ),
        ("human", "{input}"),
    ]
)

suggestion_chain = SUGGEST_PROMPT | conf.openai.get_model().with_structured_output(
    schema=ExtractorDefinition  # type: ignore
).with_config({"run_name": "suggest"})

UPDATE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are are an expert ontologist and have been asked to help a user "
            "define an information extractor.gThe existing extractor schema is "
            "provided.\ng```\n{json_schema}\n```\nThe user will describe a desired "
            "modification to the schema (e.g., adding a new field, changing a field "
            "type, etc.).Your goal is to provide a new schema that incorporates the "
            "user's desired modification.The user may also request a completely new "
            "schema, in which case you should provide a new schema based on the "
            "user's input, and ignore the existing schema.The JSON Schema should "
            "describe a top level object. The object MUST have a title and "
            "description.Unless otherwise stated all entity properties in the schema "
            "should be considered optional.",
        ),
        ("human", "{input}"),
    ]
)

UPDATE_CHAIN = (
    UPDATE_PROMPT
    | conf.openai.get_model().with_structured_output(  # noqa: W503
        schema=ExtractorDefinition  # type: ignore
    )
).with_config({"run_name": "suggest_update"})


async def _create_extractor_version_snapshot(
    db: AsyncSession,
    extractor: models.Extractor,
) -> models.ExtractorVersion:
    """Persist the next immutable extractor snapshot inside the current transaction."""
    from app.utils import compute_version_hash

    await db.execute(
        select(models.Extractor.id)
        .where(models.Extractor.id == extractor.id)
        .with_for_update()
    )
    max_ver_result = await db.execute(
        select(
            func.coalesce(func.max(models.ExtractorVersion.version_number), 0)
        ).where(models.ExtractorVersion.extractor_id == extractor.id)
    )
    next_version_number = max_ver_result.scalar_one() + 1

    version = models.ExtractorVersion(
        extractor_id=extractor.id,
        version_number=next_version_number,
        instruction=extractor.instruction,
        json_schema=extractor.json_schema,
        version_hash=compute_version_hash(extractor.instruction, extractor.json_schema),
    )
    db.add(version)
    await db.flush()
    return version


@router.post("/suggest", response_model=ExtractorDefinition)
@limiter.limit("5/minute")
async def suggest_extractor(
    request: Request, suggest_extractor: SuggestExtractor
) -> ExtractorDefinition:
    """Suggest an extractor based on a description."""
    # TODO: Have this take a bool query parameter signaling to create a new extractor
    if suggest_extractor.json_schema:
        res = await UPDATE_CHAIN.ainvoke(
            {
                "input": suggest_extractor.description,
                "json_schema": suggest_extractor.json_schema,
            }  # type: ignore
        )
    else:
        res = await suggestion_chain.ainvoke({"input": suggest_extractor.description})  # type: ignore

    console_log.warning(f"Suggested extractor: {res}")
    return res


@router.get("/{id}", response_model=schemas.ExtractorRead)
async def read_extractor(
    extractor: schemas.ExtractorRead = Depends(get_extractor),
) -> schemas.ExtractorRead:
    return extractor


@router.get("/", response_model=Sequence[schemas.ExtractorRead])
async def read_extractors(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> Sequence[schemas.ExtractorRead]:
    try:
        query = (
            select(models.Extractor)
            .options(selectinload(models.Extractor.extractor_examples))
            .where(models.Extractor.user_id == user.id)
        )
        result = await db.execute(query)
        extractors = result.scalars().all()

        return [
            schemas.ExtractorRead.model_validate(extractor, from_attributes=True)
            for extractor in extractors
        ]
    except Exception as e:
        # Log the exception for debugging
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=schemas.ExtractorRead)
async def create_extractor(
    extractor_in: schemas.ExtractorCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> schemas.ExtractorRead:
    extractor = models.Extractor(**extractor_in.model_dump(), user_id=user.id)
    db.add(extractor)
    await db.flush()

    await _create_extractor_version_snapshot(db, extractor)
    await db.commit()
    return extractor  # type: ignore


@router.put("/{id}", response_model=schemas.ExtractorRead)
async def update_extractor(
    payload: schemas.ExtractorUpdate,
    extractor: models.Extractor = Depends(get_extractor),
    db: AsyncSession = Depends(get_async_session),
) -> schemas.ExtractorRead:
    changed_fields = payload.model_dump(exclude_unset=True)
    needs_version = (
        "instruction" in changed_fields
        and changed_fields["instruction"] != extractor.instruction
    ) or (
        "json_schema" in changed_fields
        and json.dumps(changed_fields["json_schema"] or {}, sort_keys=True)
        != json.dumps(extractor.json_schema or {}, sort_keys=True)
    )

    for field, value in changed_fields.items():
        setattr(extractor, field, value)
    await db.flush()

    if needs_version:
        await _create_extractor_version_snapshot(db, extractor)

    await db.commit()
    await db.refresh(extractor)
    return schemas.ExtractorRead.model_validate(extractor, from_attributes=True)


@router.delete("/{id}", status_code=204)
async def delete_extractor(
    extractor: schemas.ExtractorRead = Depends(get_extractor),
    db: AsyncSession = Depends(get_async_session),
) -> None:
    await db.delete(extractor)
    await db.commit()


@router.get("/{id}/examples", response_model=list[schemas.ExtractorExampleRead])
async def get_extractor_examples(
    extractor: schemas.ExtractorRead = Depends(get_extractor),
    db: AsyncSession = Depends(get_async_session),
    limit: int = Query(10, ge=1),
    offset: int = Query(0, ge=0),
) -> Sequence[schemas.ExtractorExampleRead]:
    result = await db.execute(
        select(models.ExtractorExample)
        .options(joinedload(models.ExtractorExample.extractor))
        .where(models.ExtractorExample.extractor_id == extractor.id)
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()  # type: ignore


@router.get("/{id}/versions", response_model=list[schemas.ExtractorVersionRead])
async def list_extractor_versions(
    extractor: schemas.ExtractorRead = Depends(get_extractor),
    db: AsyncSession = Depends(get_async_session),
    limit: int = Query(20, ge=1),
    offset: int = Query(0, ge=0),
) -> Sequence[schemas.ExtractorVersionRead]:
    result = await db.execute(
        select(models.ExtractorVersion)
        .where(models.ExtractorVersion.extractor_id == extractor.id)
        .order_by(models.ExtractorVersion.version_number.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()  # type: ignore


@router.post("/{id}/examples", response_model=schemas.ExtractorExampleRead)
async def create_extractor_example(
    example_in: schemas.ExtractorExampleCreate,
    extractor: schemas.ExtractorRead = Depends(get_extractor),
    db: AsyncSession = Depends(get_async_session),
) -> schemas.ExtractorExampleRead:
    example = models.ExtractorExample(
        **example_in.model_dump(), extractor_id=extractor.id
    )
    db.add(example)
    await db.commit()
    return example


@router.delete("/{id}/examples/{example_id}", status_code=204)
async def delete_extractor_example(
    id: UUID4,
    example: models.ExtractorExample = Depends(get_extractor_example),
    db: AsyncSession = Depends(get_async_session),
) -> None:
    await db.delete(example)
    await db.commit()


@router.post("/{id}/run", response_model=schemas.ExtractorResponse)
@limiter.limit("5/minute")
async def extractor_runner(
    request: Request,
    extractor: schemas.ExtractorRead = Depends(get_extractor),
    payload: schemas.ExtractorRun = Depends(get_extractor_run_payload),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> schemas.ExtractorResponse:
    """Run an extractor on a given payload"""
    return await run_extractor(extractor, payload, user, db)


@router.post("/{id}/run/{event_id}/retry", response_model=schemas.ExtractorResponse)
async def retry_extractor_run(
    event_id: UUID4,
    extractor: schemas.ExtractorRead = Depends(get_extractor),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> schemas.ExtractorResponse:
    """Retry a failed extractor run by re-executing against the same source."""
    event_result = await db.execute(
        select(models.OrchestrationEvent)
        .join(
            models.OrchestrationPipeline,
            models.OrchestrationEvent.pipeline_id == models.OrchestrationPipeline.id,
        )
        .where(
            models.OrchestrationEvent.id == event_id,
            models.OrchestrationPipeline.user_id == user.id,
        )
    )
    event = event_result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    if event.status != "failure":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot retry event with status '{event.status}'. Must be 'failure'.",
        )

    # Prevent double-retry
    existing = await db.execute(
        select(models.OrchestrationEvent).where(
            models.OrchestrationEvent.retry_of_id == event_id,
            models.OrchestrationEvent.status.in_(
                ["pending", "running", "pending_review"]
            ),
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="An active retry already exists.")

    try:
        retry_payload = rehydrate_extractor_run(event.payload)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Stored retry source is missing for event {event_id}.",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return await run_extractor(extractor, retry_payload, user, db, retry_of_id=event.id)
