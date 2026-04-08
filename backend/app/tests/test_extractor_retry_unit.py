"""Tests for app.core.extractor_retry – payload helpers and rehydration."""

from unittest.mock import MagicMock

import pytest

from app import schemas
from app.core.extractor_retry import (
    FILE_CONTENT_TYPE_KEY,
    FILE_SOURCE_PATH_KEY,
    SOURCE_KIND_KEY,
    _build_upload_file,
    build_extractor_event_payload,
    build_extractor_source_uri,
    get_extractor_event_file_source_paths,
    get_extractor_source_kind,
    rehydrate_extractor_run,
)

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _make_payload(*, text=None, url=None, file=None, mode="entire_document", llm=None):
    """Build a minimal ExtractorRun-like object for testing."""
    mock = MagicMock(spec=schemas.ExtractorRun)
    mock.text = text
    mock.url = url
    mock.file = file
    mock.mode = mode
    mock.llm = llm
    return mock


# ---------------------------------------------------------------------------
# get_extractor_source_kind
# ---------------------------------------------------------------------------


def test_source_kind_text():
    payload = _make_payload(text="some content")
    assert get_extractor_source_kind(payload) == "text"


def test_source_kind_url():
    payload = _make_payload(url="https://example.com")
    assert get_extractor_source_kind(payload) == "url"


def test_source_kind_file():
    payload = _make_payload(
        file=MagicMock(filename="doc.pdf", content_type="application/pdf")
    )
    assert get_extractor_source_kind(payload) == "file"


def test_source_kind_none():
    payload = _make_payload()
    assert get_extractor_source_kind(payload) is None


def test_source_kind_text_takes_priority():
    """text is checked first, even if url is also set."""
    payload = _make_payload(text="content", url="https://example.com")
    assert get_extractor_source_kind(payload) == "text"


# ---------------------------------------------------------------------------
# build_extractor_event_payload
# ---------------------------------------------------------------------------


def test_build_event_payload_text():
    payload = _make_payload(text="hello", mode="entire_document", llm="gpt-4")
    result = build_extractor_event_payload(payload)
    assert result[SOURCE_KIND_KEY] == "text"
    assert result["text"] == "hello"
    assert result["url"] is None
    assert result[FILE_SOURCE_PATH_KEY] is None


def test_build_event_payload_url():
    payload = _make_payload(url="https://example.com/page")
    result = build_extractor_event_payload(payload)
    assert result[SOURCE_KIND_KEY] == "url"
    assert result["url"] == "https://example.com/page"
    assert result["text"] is None


def test_build_event_payload_file():
    mock_file = MagicMock()
    mock_file.filename = "resume.pdf"
    mock_file.content_type = "application/pdf"
    payload = _make_payload(file=mock_file)
    result = build_extractor_event_payload(
        payload, file_source_path="uploads/x/y/source.pdf"
    )
    assert result[SOURCE_KIND_KEY] == "file"
    assert result["file"] == "resume.pdf"
    assert result[FILE_CONTENT_TYPE_KEY] == "application/pdf"
    assert result[FILE_SOURCE_PATH_KEY] == "uploads/x/y/source.pdf"


# ---------------------------------------------------------------------------
# build_extractor_source_uri
# ---------------------------------------------------------------------------


def test_build_source_uri_url():
    payload = _make_payload(url="https://example.com/page")
    uri = build_extractor_source_uri(payload)
    assert uri is not None
    assert uri.type == schemas.URIType.URL
    assert uri.name == "https://example.com/page"


def test_build_source_uri_file():
    mock_file = MagicMock()
    mock_file.filename = "resume.pdf"
    payload = _make_payload(file=mock_file)
    uri = build_extractor_source_uri(payload, file_source_path="uploads/x.pdf")
    assert uri is not None
    assert uri.type == schemas.URIType.FILE
    assert uri.name == "uploads/x.pdf"


def test_build_source_uri_text_returns_none():
    payload = _make_payload(text="content")
    assert build_extractor_source_uri(payload) is None


# ---------------------------------------------------------------------------
# get_extractor_event_file_source_paths
# ---------------------------------------------------------------------------


def test_file_source_paths_present():
    payload = {FILE_SOURCE_PATH_KEY: "uploads/run/source.pdf"}
    assert get_extractor_event_file_source_paths(payload) == ["uploads/run/source.pdf"]


def test_file_source_paths_absent():
    assert get_extractor_event_file_source_paths({"text": "hello"}) == []


def test_file_source_paths_none_input():
    assert get_extractor_event_file_source_paths(None) == []


def test_file_source_paths_non_dict():
    assert get_extractor_event_file_source_paths("not-a-dict") == []


def test_file_source_paths_empty_string():
    assert get_extractor_event_file_source_paths({FILE_SOURCE_PATH_KEY: ""}) == []


# ---------------------------------------------------------------------------
# rehydrate_extractor_run – text mode
# ---------------------------------------------------------------------------


def test_rehydrate_text_payload():
    payload = {
        SOURCE_KIND_KEY: "text",
        "text": "hello world",
        "mode": "entire_document",
    }
    run = rehydrate_extractor_run(payload)
    assert run.text == "hello world"
    assert run.mode == "entire_document"


def test_rehydrate_missing_text_raises():
    payload = {SOURCE_KIND_KEY: "text", "text": None}
    with pytest.raises(ValueError, match="text is missing"):
        rehydrate_extractor_run(payload)


def test_rehydrate_missing_payload_raises():
    with pytest.raises(ValueError, match="missing"):
        rehydrate_extractor_run(None)


def test_rehydrate_no_source_kind_infers_text():
    payload = {"text": "fallback content", "mode": "entire_document"}
    run = rehydrate_extractor_run(payload)
    assert run.text == "fallback content"


def test_rehydrate_unknown_source_raises():
    payload = {SOURCE_KIND_KEY: "unknown"}
    with pytest.raises(ValueError, match="retryable source"):
        rehydrate_extractor_run(payload)


# ---------------------------------------------------------------------------
# _build_upload_file
# ---------------------------------------------------------------------------


def test_build_upload_file_with_content_type():
    upload = _build_upload_file(
        file_bytes=b"data", file_name="test.pdf", content_type="application/pdf"
    )
    assert upload.filename == "test.pdf"
    assert upload.headers["content-type"] == "application/pdf"


def test_build_upload_file_no_content_type():
    upload = _build_upload_file(file_bytes=b"data", file_name=None, content_type=None)
    assert upload.filename == "uploaded-file"


def test_build_upload_file_reads_content():
    upload = _build_upload_file(
        file_bytes=b"hello", file_name="f.txt", content_type=None
    )
    assert upload.file.read() == b"hello"
