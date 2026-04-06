from io import BytesIO
from typing import Any, Literal

from fastapi import UploadFile
from pydantic import ValidationError
from starlette.datastructures import Headers

from app import schemas
from app.core.document_storage import resolve_extractor_run_source_path

ExtractorSourceKind = Literal["text", "url", "file"]

SOURCE_KIND_KEY = "source_kind"
FILE_CONTENT_TYPE_KEY = "file_content_type"
FILE_SOURCE_PATH_KEY = "file_source_path"


def get_extractor_source_kind(
    payload: schemas.ExtractorRun,
) -> ExtractorSourceKind | None:
    if payload.text:
        return "text"
    if payload.url:
        return "url"
    if payload.file:
        return "file"
    return None


def build_extractor_event_payload(
    payload: schemas.ExtractorRun,
    *,
    file_source_path: str | None = None,
) -> dict[str, Any]:
    source_kind = get_extractor_source_kind(payload)
    stored_url = str(payload.url) if source_kind == "url" and payload.url else None
    file_name = (
        payload.file.filename if source_kind == "file" and payload.file else None
    )
    file_content_type = (
        payload.file.content_type if source_kind == "file" and payload.file else None
    )

    return {
        "mode": payload.mode,
        "llm": payload.llm,
        SOURCE_KIND_KEY: source_kind,
        "text": payload.text if source_kind == "text" else None,
        "url": stored_url,
        "file": file_name,
        FILE_CONTENT_TYPE_KEY: file_content_type,
        FILE_SOURCE_PATH_KEY: file_source_path if source_kind == "file" else None,
    }


def build_extractor_source_uri(
    payload: schemas.ExtractorRun,
    *,
    file_source_path: str | None = None,
) -> schemas.URI | None:
    source_kind = get_extractor_source_kind(payload)
    if source_kind == "url" and payload.url:
        return schemas.URI(name=str(payload.url), type=schemas.URIType.URL)
    if source_kind == "file":
        return schemas.URI(
            name=file_source_path or payload.file.filename or "uploaded-file",
            type=schemas.URIType.FILE,
        )
    return None


def get_extractor_event_file_source_paths(
    payload: dict[str, Any] | None,
) -> list[str]:
    if not isinstance(payload, dict):
        return []

    file_source_path = payload.get(FILE_SOURCE_PATH_KEY)
    if isinstance(file_source_path, str) and file_source_path:
        return [file_source_path]
    return []


def rehydrate_extractor_run(payload: dict[str, Any] | None) -> schemas.ExtractorRun:
    if not isinstance(payload, dict):
        raise ValueError("Persisted extractor input is missing.")

    mode = payload.get("mode", "entire_document")
    llm = payload.get("llm")
    source_kind = payload.get(SOURCE_KIND_KEY)

    if source_kind not in {"text", "url", "file"}:
        if payload.get(FILE_SOURCE_PATH_KEY):
            source_kind = "file"
        elif payload.get("url"):
            source_kind = "url"
        elif payload.get("text"):
            source_kind = "text"

    if source_kind == "text":
        text = payload.get("text")
        if not text:
            raise ValueError("Persisted retry text is missing.")
        return _build_extractor_run(mode=mode, llm=llm, text=text)

    if source_kind == "url":
        url = payload.get("url")
        if not url:
            raise ValueError("Persisted retry URL is missing.")
        return _build_extractor_run(mode=mode, llm=llm, url=url)

    if source_kind == "file":
        relative_path = payload.get(FILE_SOURCE_PATH_KEY)
        if not relative_path:
            raise ValueError(
                "Persisted retry upload is missing its stored source path."
            )

        absolute_path = resolve_extractor_run_source_path(relative_path)
        if not absolute_path.exists():
            raise FileNotFoundError(relative_path)

        upload = _build_upload_file(
            file_bytes=absolute_path.read_bytes(),
            file_name=payload.get("file"),
            content_type=payload.get(FILE_CONTENT_TYPE_KEY),
        )
        return _build_extractor_run(mode=mode, llm=llm, file=upload)

    raise ValueError("Persisted extractor input does not contain a retryable source.")


def _build_extractor_run(**kwargs: Any) -> schemas.ExtractorRun:
    try:
        return schemas.ExtractorRun(**kwargs)
    except ValidationError as exc:
        raise ValueError("Persisted extractor input is invalid.") from exc


def _build_upload_file(
    *,
    file_bytes: bytes,
    file_name: str | None,
    content_type: str | None,
) -> UploadFile:
    headers = None
    if content_type:
        headers = Headers({"content-type": content_type})

    return UploadFile(
        file=BytesIO(file_bytes),
        filename=file_name or "uploaded-file",
        headers=headers,
    )
