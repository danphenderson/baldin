from pathlib import Path
from typing import Iterable
from uuid import UUID

from app.core import conf

UPLOADS_SUBDIR = "uploads"
EXTRACTOR_RUNS_SUBDIR = "extractor-runs"
MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024


def public_assets_root() -> Path:
    return (conf.PROJECT_DIR / conf.settings.PUBLIC_ASSETS_DIR).resolve()


def document_uploads_root() -> Path:
    return (public_assets_root() / UPLOADS_SUBDIR).resolve()


def build_document_source_path(
    user_id: UUID | str,
    document_id: UUID | str,
    version_number: int,
    *,
    suffix: str = ".pdf",
) -> str:
    return f"{UPLOADS_SUBDIR}/{user_id}/{document_id}/v{version_number}{suffix}"


def build_extractor_run_source_path(
    user_id: UUID | str,
    source_id: UUID | str,
    *,
    file_name: str | None = None,
) -> str:
    suffix = Path(file_name or "").suffix
    return (
        f"{UPLOADS_SUBDIR}/{EXTRACTOR_RUNS_SUBDIR}/{user_id}/{source_id}/source{suffix}"
    )


def resolve_document_source_path(relative_path: str) -> Path:
    absolute_path = (public_assets_root() / relative_path).resolve()
    uploads_root = document_uploads_root()
    try:
        absolute_path.relative_to(uploads_root)
    except ValueError as exc:
        raise ValueError(
            "Document source file path must stay under the uploads root"
        ) from exc
    return absolute_path


def save_document_source_file(relative_path: str, file_bytes: bytes) -> Path:
    absolute_path = resolve_document_source_path(relative_path)
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(file_bytes)
    return absolute_path


def resolve_extractor_run_source_path(relative_path: str) -> Path:
    return resolve_document_source_path(relative_path)


def save_extractor_run_source_file(relative_path: str, file_bytes: bytes) -> Path:
    return save_document_source_file(relative_path, file_bytes)


def remove_document_source_files(relative_paths: Iterable[str | None]) -> None:
    uploads_root = document_uploads_root()
    seen_paths: set[str] = set()

    for relative_path in relative_paths:
        if not relative_path or relative_path in seen_paths:
            continue
        seen_paths.add(relative_path)

        try:
            absolute_path = resolve_document_source_path(relative_path)
        except ValueError:
            continue

        if absolute_path.exists():
            absolute_path.unlink()

        current = absolute_path.parent
        while current != uploads_root and current.exists() and current.is_dir():
            try:
                current.rmdir()
            except OSError:
                break
            current = current.parent


def remove_extractor_run_source_files(relative_paths: Iterable[str | None]) -> None:
    remove_document_source_files(relative_paths)
