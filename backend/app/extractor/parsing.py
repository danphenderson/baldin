"""Convert binary input to blobs and parse them using the appropriate parser."""

from __future__ import annotations

import mimetypes
from typing import BinaryIO, List

from fastapi import HTTPException

try:
    from langchain_community.document_loaders import Blob
    from langchain_community.document_loaders.parsers import (
        BS4HTMLParser,
        PDFMinerParser,
    )
    from langchain_community.document_loaders.parsers.generic import MimeTypeBasedParser
    from langchain_community.document_loaders.parsers.txt import TextParser
except ImportError:  # pragma: no cover
    from langchain.document_loaders.parsers import BS4HTMLParser, PDFMinerParser
    from langchain.document_loaders.parsers.generic import MimeTypeBasedParser
    from langchain.document_loaders.parsers.txt import TextParser
    from langchain_community.document_loaders import Blob

from langchain_core.documents import Document

HANDLERS = {
    "application/pdf": PDFMinerParser(),
    "text/plain": TextParser(),
    "text/x-tex": TextParser(),
    "application/x-tex": TextParser(),
    "text/html": BS4HTMLParser(),
    "application/xhtml+xml": BS4HTMLParser(),
    # Disable for now as they rely on unstructured and there's some install
    # issue with unstructured.
    # from langchain.document_loaders.parsers.msword import MsWordParser
    # "application/msword": MsWordParser(),
    # "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (
    #     MsWordParser()
    # ),
}

SUPPORTED_MIMETYPES = sorted(HANDLERS.keys())

MAX_FILE_SIZE_MB = 10  # in MB


def _normalize_mimetype(mimetype: str | None) -> str | None:
    """Normalize mime-types to the parser keys supported by this module."""
    if not mimetype:
        return None

    normalized = mimetype.split(";", 1)[0].strip().lower()

    if normalized == "application/xhtml+xml":
        return "text/html"

    if normalized in {"application/x-tex", "text/x-tex"}:
        return "text/plain"

    if normalized.startswith("text/") and normalized != "text/html":
        return "text/plain"

    return normalized


def _guess_mimetype_with_magic(file_bytes: bytes) -> str | None:
    """Ask python-magic for the mime-type when libmagic is available."""
    try:
        import magic
    except ImportError:
        return None

    try:
        mime = magic.Magic(mime=True)
        return _normalize_mimetype(mime.from_buffer(file_bytes))
    except Exception:
        return None


def _looks_like_text(file_bytes: bytes) -> bool:
    """Detect whether a byte stream is likely plain text."""
    sample = file_bytes[:2048]

    if not sample:
        return True

    if b"\x00" in sample:
        return False

    try:
        sample.decode("utf-8")
        return True
    except UnicodeDecodeError:
        printable_bytes = sum(
            byte in {9, 10, 13} or 32 <= byte <= 126 for byte in sample
        )
        return printable_bytes / len(sample) >= 0.9


def _guess_mimetype_from_content(file_bytes: bytes) -> str | None:
    """Use lightweight content sniffing for common supported formats."""
    sample = file_bytes[:2048].lstrip().lower()

    if sample.startswith(b"%pdf-"):
        return "application/pdf"

    if sample.startswith((b"<!doctype html", b"<html", b"<head", b"<body")):
        return "text/html"

    if _looks_like_text(file_bytes):
        return "text/plain"

    return None


def _guess_mimetype(
    file_bytes: bytes,
    file_name: str | None = None,
    content_type: str | None = None,
) -> str:
    """Guess the mime-type of a file without requiring libmagic to exist."""
    guessed_from_name, _ = mimetypes.guess_type(file_name or "")
    candidates = [
        _guess_mimetype_with_magic(file_bytes),
        _guess_mimetype_from_content(file_bytes),
        _normalize_mimetype(content_type),
        _normalize_mimetype(guessed_from_name),
    ]

    for candidate in candidates:
        if candidate in HANDLERS:
            return candidate

    supported_types = ", ".join(SUPPORTED_MIMETYPES)
    raise HTTPException(
        status_code=415,
        detail=f"Unsupported file type. Supported file types: {supported_types}.",
    )


def _get_file_size_in_mb(data: BinaryIO) -> float:
    """Get file size in MB."""
    data.seek(0, 2)  # Move the cursor to the end of the file
    file_size = data.tell()
    file_size_in_mb = file_size / (1024 * 1024)
    data.seek(0)
    return file_size_in_mb


# PUBLIC API

MIMETYPE_BASED_PARSER = MimeTypeBasedParser(
    handlers=HANDLERS,
    fallback_parser=None,
)


def convert_binary_input_to_blob(
    data: BinaryIO,
    file_name: str | None = None,
    content_type: str | None = None,
) -> Blob:
    """Convert ingestion input to blob."""
    file_size_in_mb = _get_file_size_in_mb(data)

    if file_size_in_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds the maximum limit of {MAX_FILE_SIZE_MB} MB.",
        )

    file_data = data.read()
    resolved_name = file_name or getattr(data, "name", None) or "uploaded-file"
    mimetype = _guess_mimetype(file_data, resolved_name, content_type)

    return Blob.from_data(
        data=file_data,
        path=resolved_name,
        mime_type=mimetype,
    )


def parse_binary_input(
    data: BinaryIO,
    file_name: str | None = None,
    content_type: str | None = None,
) -> List[Document]:
    """Parse binary input."""
    blob = convert_binary_input_to_blob(
        data, file_name=file_name, content_type=content_type
    )
    return MIMETYPE_BASED_PARSER.parse(blob)
