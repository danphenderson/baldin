# app/api/routes/extractor.py
import re
from typing import Annotated, Literal, Sequence

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload
from typing_extensions import TypedDict

from app.api.deps import (
    MAX_FILE_SIZE_MB,
    SUPPORTED_MIMETYPES,
    AsyncSession,
    console_log,
    extract_entire_document,
    extract_from_content,
    get_async_session,
    get_current_user,
    get_extractor,
    get_extractor_example,
    models,
    parse_binary_input,
    schemas,
)
from app.core import conf

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


@router.post("/run", response_model=schemas.ExtractorRead)
async def run_extractor(
    extractor_id: Annotated[UUID4, Form()],
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
    mode: Literal["entire_document", "retrieval"] = Form("entire_document"),
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
    llm: str = Form(conf.openai.COMPLETION_MODEL),
) -> schemas.ExtractorResponse:
    if text is None and file is None:
        raise HTTPException(status_code=422, detail="No text or file provided.")

    extractor = (
        await db.execute(
            select(models.Extractor).filter_by(uuid=extractor_id, user_id=user.id)
        )
    ).scalar()

    if extractor is None:
        raise HTTPException(status_code=404, detail="Extractor not found for owner.")

    if text:
        text_ = text
    else:
        documents = parse_binary_input(file.file)
        # TODO: Add metadata like location from original file where
        # the text was extracted from
        text_ = "\n".join([document.page_content for document in documents])
    if mode == "entire_document":
        return await extract_entire_document(text_, extractor, llm)
    elif mode == "retrieval":
        return await extract_from_content(text_, extractor, llm)
    else:
        raise ValueError(
            f"Invalid mode {mode}. Expected one of 'entire_document', 'retrieval'."
        )


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

        return [schemas.ExtractorRead.from_orm(extractor) for extractor in extractors]
    except Exception as e:
        # Log the exception for debugging
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=schemas.ExtractorRead)
async def create_extractor(
    extractor_in: schemas.ExtractorCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> schemas.ExtractorRead:
    extractor = models.Extractor(**extractor_in.dict(), user_id=user.id)
    db.add(extractor)
    await db.commit()
    return extractor  # type: ignore


@router.put("/{id}", response_model=schemas.ExtractorRead)
async def update_extractor(
    payload: schemas.ExtractorUpdate,
    extractor: schemas.ExtractorRead = Depends(get_extractor),
    db: AsyncSession = Depends(get_async_session),
) -> schemas.ExtractorRead:
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(extractor, field, value)
    await db.commit()
    await db.refresh(extractor)
    return schemas.ExtractorRead.from_orm(extractor)


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


@router.post("/{id}/examples", response_model=schemas.ExtractorExampleRead)
async def create_extractor_example(
    example_in: schemas.ExtractorExampleCreate,
    extractor: schemas.ExtractorRead = Depends(get_extractor),
    db: AsyncSession = Depends(get_async_session),
) -> schemas.ExtractorExampleRead:
    example = models.ExtractorExample(**example_in.dict(), extractor_id=extractor.id)
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
