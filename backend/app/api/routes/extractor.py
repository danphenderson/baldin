# app/api/routes/extractor.py
import json
from typing import Annotated, Literal, Sequence, TypedDict
from urllib import response

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import UUID4
from sqlalchemy import UUID, select
from sqlalchemy.orm import joinedload

from app.api.deps import (
    MAX_FILE_SIZE_MB,
    SUPPORTED_MIMETYPES,
    AsyncSession,
    extract_entire_document,
    extract_from_content,
    get_async_session,
    get_current_user,
    get_extractor,
    models,
    parse_binary_input,
    schemas,
)
from app.core import conf

router: APIRouter = APIRouter()

@router.post("", response_model=schemas.ExtractorRead)
async def run_extractor(
    extractor_id: Annotated[UUID, Form()],,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
    mode: Literal["entire_document", "retrieval"] = Form("entire_document"),
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
    model_name: str = Form(conf.openai.COMPLETION_MODEL),
) -> schemas.ExtractorRespose:
    if text is None and file is None:
        raise HTTPException(status_code=422, detail="No text or file provided.")

    extractor = (
        await db.execute(
            select(models.Extractor)
            .filter_by(uuid=extractor_id, owner_id=user.id)
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
        return await extract_entire_document(text_, extractor, model_name)
    elif mode == "retrieval":
        return await extract_from_content(text_, extractor, model_name)
    else:
        raise ValueError(
            f"Invalid mode {mode}. Expected one of 'entire_document', 'retrieval'."
        )

@router.get("/{id}", response_model=schemas.ExtractorRead)
async def get_extractors(
    extractor: schemas.ExtractorRead = Depends(get_extractor),
) -> schemas.ExtractorRead:
    return extractor

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
    return result.scalars().all() # type: ignore


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


@router.delete("/{id}/examples/{example_id}")
async def delete_extractor_example(
    extractor: schemas.ExtractorRead = Depends(get_extractor),
    example: models.ExtractorExample = Depends(get_extractor_examples),
    db: AsyncSession = Depends(get_async_session),
) -> None:
    await db.delete(example)
    await db.commit()


class ConfigurationResponse(TypedDict):
    """Response for configuration."""

    available_models: list[str]
    accepted_mimetypes: list[str]
    max_file_size_mb: int
    max_concurrency: int
    max_chunks: int
    models: list[dict]


@router.get("/configurables", response_model=ConfigurationResponse)
def get_configuration() -> ConfigurationResponse:
    """Endpoint to show server configuration."""
    return {
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
        "max_chunks": conf.settings.MAX_CHUNKS, # type: ignore
    }
