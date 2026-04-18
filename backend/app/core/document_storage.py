from pathlib import Path
from typing import Iterable
from uuid import UUID

from app.core import conf

UPLOADS_SUBDIR = "uploads"
AVATARS_SUBDIR = "avatars"
EXTRACTOR_RUNS_SUBDIR = "extractor-runs"
MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_AVATAR_UPLOAD_BYTES = 2 * 1024 * 1024
ALLOWED_AVATAR_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
_AVATAR_CONTENT_TYPE_SUFFIX = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
_AVATAR_SIGNATURES = {
    "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/webp": lambda data: data.startswith(b"RIFF") and data[8:12] == b"WEBP",
    "image/gif": lambda data: data.startswith((b"GIF87a", b"GIF89a")),
}


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


# ── Avatar helpers ───────────────────────────────────────────────────────


def build_avatar_path(
    user_id: UUID | str,
    content_type: str,
) -> str:
    normalized_content_type = normalize_avatar_content_type(content_type)
    suffix = _AVATAR_CONTENT_TYPE_SUFFIX.get(normalized_content_type)
    if suffix is None:
        raise ValueError(
            f"Unsupported avatar content type: {normalized_content_type}. "
            f"Allowed: {', '.join(sorted(ALLOWED_AVATAR_CONTENT_TYPES))}"
        )
    return f"{UPLOADS_SUBDIR}/{AVATARS_SUBDIR}/{user_id}/avatar{suffix}"


def normalize_avatar_content_type(content_type: str | None) -> str:
    return (content_type or "").split(";", 1)[0].strip().lower()


def sniff_avatar_content_type(file_bytes: bytes) -> str | None:
    for content_type, matcher in _AVATAR_SIGNATURES.items():
        if matcher(file_bytes):
            return content_type
    return None


def resolve_avatar_path(relative_path: str) -> Path:
    return resolve_document_source_path(relative_path)


def save_avatar_file(relative_path: str, file_bytes: bytes) -> Path:
    return save_document_source_file(relative_path, file_bytes)


def find_avatar_file(user_id: UUID | str) -> Path | None:
    """Return the avatar file path for a user, or None if no avatar exists."""
    avatar_dir = document_uploads_root() / AVATARS_SUBDIR / str(user_id)
    if not avatar_dir.is_dir():
        return None
    for child in avatar_dir.iterdir():
        if child.is_file() and child.stem == "avatar":
            return child
    return None


def remove_avatar_files(user_id: UUID | str) -> None:
    """Remove all existing avatar files for a user."""
    avatar_dir = document_uploads_root() / AVATARS_SUBDIR / str(user_id)
    if not avatar_dir.is_dir():
        return
    for child in avatar_dir.iterdir():
        if child.is_file() and child.stem == "avatar":
            child.unlink()
