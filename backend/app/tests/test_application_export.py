# Path: app/tests/test_application_export.py
"""Tests for GET /applications/{id}/export (ZIP materials export)."""

import zipfile
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.routes import applications as app_routes
from app.api.routes.applications import _safe_filename, _text_to_pdf

# ---------------------------------------------------------------------------
#  Unit: helper functions
# ---------------------------------------------------------------------------


def test_text_to_pdf_returns_valid_pdf():
    data = _text_to_pdf("Hello, world!")
    assert data[:5] == b"%PDF-"


def test_safe_filename_strips_slashes():
    assert _safe_filename("a/b\\c") == "a_b_c"
    assert _safe_filename("normal") == "normal"
    assert _safe_filename("null\0byte") == "nullbyte"


# ---------------------------------------------------------------------------
#  Unit: export endpoint logic
# ---------------------------------------------------------------------------


def _fake_app(user_id, app_id=None):
    return SimpleNamespace(id=app_id or uuid4(), user_id=user_id)


class _FakeResult:
    """Mimics the chained .scalars().all() pattern from SQLAlchemy."""

    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return self

    def all(self):
        return self._rows


class _FakeSession:
    """Minimal async session stand-in that returns pre-configured query results."""

    def __init__(self, results_by_call):
        self._results = list(results_by_call)
        self._call = 0

    async def execute(self, stmt):
        result = self._results[self._call]
        self._call += 1
        return _FakeResult(result)


@pytest.mark.asyncio
async def test_export_403_when_not_owner():
    owner_id = uuid4()
    other_id = uuid4()
    app = _fake_app(user_id=owner_id)
    user = SimpleNamespace(id=other_id)

    with pytest.raises(HTTPException) as exc_info:
        await app_routes.export_application_materials(app=app, db=None, user=user)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_export_404_when_no_materials():
    uid = uuid4()
    app = _fake_app(user_id=uid)
    user = SimpleNamespace(id=uid)
    db = _FakeSession([[], [], []])

    with pytest.raises(HTTPException) as exc_info:
        await app_routes.export_application_materials(app=app, db=db, user=user)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_export_zip_with_resume_and_cover_letter():
    uid = uuid4()
    app = _fake_app(user_id=uid)
    user = SimpleNamespace(id=uid)

    resume = SimpleNamespace(name="My Resume", content="Resume body text")
    cover_letter = SimpleNamespace(name="My CL", content="CL body text")

    db = _FakeSession([[resume], [cover_letter], []])

    response = await app_routes.export_application_materials(app=app, db=db, user=user)
    assert response.media_type == "application/zip"

    # Read the streaming body
    body = b""
    async for chunk in response.body_iterator:
        if isinstance(chunk, str):
            chunk = chunk.encode()
        body += chunk

    zf = zipfile.ZipFile(BytesIO(body))
    names = zf.namelist()
    assert "resumes/My Resume.pdf" in names
    assert "cover_letters/My CL.pdf" in names

    # Each entry should contain valid PDF data
    for name in names:
        assert zf.read(name)[:5] == b"%PDF-"


@pytest.mark.asyncio
async def test_export_zip_with_document_source_file(tmp_path):
    uid = uuid4()
    app = _fake_app(user_id=uid)
    user = SimpleNamespace(id=uid)

    # Prepare a fake source file on disk
    fake_pdf = b"%PDF-1.4 fake document bytes"
    source = tmp_path / "test.pdf"
    source.write_bytes(fake_pdf)

    head_version = SimpleNamespace(
        source_file="uploads/test.pdf", content="fallback text"
    )
    doc = SimpleNamespace(title="Uploaded Doc", head_version=head_version)

    db = _FakeSession([[], [], [doc]])

    with patch.object(
        app_routes,
        "resolve_document_source_path",
        return_value=source,
    ):
        response = await app_routes.export_application_materials(
            app=app, db=db, user=user
        )

    body = b""
    async for chunk in response.body_iterator:
        if isinstance(chunk, str):
            chunk = chunk.encode()
        body += chunk

    zf = zipfile.ZipFile(BytesIO(body))
    assert "documents/Uploaded Doc.pdf" in zf.namelist()
    assert zf.read("documents/Uploaded Doc.pdf") == fake_pdf


@pytest.mark.asyncio
async def test_export_zip_document_falls_back_to_content():
    uid = uuid4()
    app = _fake_app(user_id=uid)
    user = SimpleNamespace(id=uid)

    head_version = SimpleNamespace(source_file=None, content="Some text content")
    doc = SimpleNamespace(title="Text Doc", head_version=head_version)

    db = _FakeSession([[], [], [doc]])

    response = await app_routes.export_application_materials(app=app, db=db, user=user)

    body = b""
    async for chunk in response.body_iterator:
        if isinstance(chunk, str):
            chunk = chunk.encode()
        body += chunk

    zf = zipfile.ZipFile(BytesIO(body))
    assert "documents/Text Doc.pdf" in zf.namelist()
    assert zf.read("documents/Text Doc.pdf")[:5] == b"%PDF-"
