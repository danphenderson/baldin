"""Tests for app.core.document_storage – path building and resolution."""

import pytest
from uuid import uuid4

from app.core.document_storage import (
    build_document_source_path,
    build_extractor_run_source_path,
    resolve_document_source_path,
    save_document_source_file,
    remove_document_source_files,
)


# ---------------------------------------------------------------------------
# build_document_source_path
# ---------------------------------------------------------------------------


def test_build_document_source_path_defaults():
    user_id = uuid4()
    doc_id = uuid4()
    result = build_document_source_path(user_id, doc_id, 1)
    assert result == f"uploads/{user_id}/{doc_id}/v1.pdf"


def test_build_document_source_path_custom_suffix():
    user_id = uuid4()
    doc_id = uuid4()
    result = build_document_source_path(user_id, doc_id, 3, suffix=".docx")
    assert result == f"uploads/{user_id}/{doc_id}/v3.docx"


def test_build_document_source_path_string_ids():
    result = build_document_source_path("user-1", "doc-2", 5)
    assert result == "uploads/user-1/doc-2/v5.pdf"


# ---------------------------------------------------------------------------
# build_extractor_run_source_path
# ---------------------------------------------------------------------------


def test_build_extractor_run_source_path_no_filename():
    user_id = uuid4()
    source_id = uuid4()
    result = build_extractor_run_source_path(user_id, source_id)
    assert result == f"uploads/extractor-runs/{user_id}/{source_id}/source"


def test_build_extractor_run_source_path_with_filename():
    user_id = uuid4()
    source_id = uuid4()
    result = build_extractor_run_source_path(user_id, source_id, file_name="data.csv")
    assert result == f"uploads/extractor-runs/{user_id}/{source_id}/source.csv"


def test_build_extractor_run_source_path_with_pdf():
    result = build_extractor_run_source_path("u1", "s1", file_name="resume.pdf")
    assert result.endswith("/source.pdf")


# ---------------------------------------------------------------------------
# resolve / save / remove (path traversal guard)
# ---------------------------------------------------------------------------


def test_resolve_document_source_path_rejects_traversal():
    with pytest.raises(ValueError, match="uploads root"):
        resolve_document_source_path("../../etc/passwd")


def test_save_and_remove_round_trip(tmp_path, monkeypatch):
    """Verify save writes bytes and remove cleans up."""
    import app.core.document_storage as ds

    monkeypatch.setattr(ds, "public_assets_root", lambda: tmp_path)
    monkeypatch.setattr(ds, "document_uploads_root", lambda: tmp_path / "uploads")

    rel = "uploads/testuser/testdoc/v1.pdf"
    saved = save_document_source_file(rel, b"hello-pdf")
    assert saved.exists()
    assert saved.read_bytes() == b"hello-pdf"

    remove_document_source_files([rel])
    assert not saved.exists()


def test_remove_document_source_files_skips_none_and_dupes(tmp_path, monkeypatch):
    import app.core.document_storage as ds

    monkeypatch.setattr(ds, "public_assets_root", lambda: tmp_path)
    monkeypatch.setattr(ds, "document_uploads_root", lambda: tmp_path / "uploads")

    rel = "uploads/u/d/v1.pdf"
    save_document_source_file(rel, b"content")

    # None and duplicates should not cause errors
    remove_document_source_files([None, rel, rel, None])
