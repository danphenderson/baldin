# Path: app/tests/test_application_export.py
"""Tests for GET /applications/{id}/export (ZIP materials export)."""

import zipfile
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from reportlab.platypus import Paragraph

from app.api.routes import applications as app_routes
from app.api.routes.applications import (
    _document_version_to_pdf,
    _safe_filename,
    _text_to_pdf,
)

# ---------------------------------------------------------------------------
#  Unit: helper functions
# ---------------------------------------------------------------------------


def test_text_to_pdf_returns_valid_pdf():
    data = _text_to_pdf("Hello, world!")
    assert data[:5] == b"%PDF-"


def test_document_version_to_pdf_uses_tiptap_renderer(monkeypatch: pytest.MonkeyPatch):
    calls = []

    def fake_tiptap_to_flowables(raw_content, base_style):
        calls.append((raw_content, base_style.name))
        return [Paragraph("Rendered", base_style)]

    monkeypatch.setattr(app_routes, "_tiptap_to_flowables", fake_tiptap_to_flowables)

    version = SimpleNamespace(
        content='{"type":"doc","content":[]}',
        content_format="tiptap_json",
    )

    data = _document_version_to_pdf(version)

    assert data[:5] == b"%PDF-"
    assert calls == [('{"type":"doc","content":[]}', "ExportDefault")]


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
    db = _FakeSession([[]])

    with pytest.raises(HTTPException) as exc_info:
        await app_routes.export_application_materials(app=app, db=db, user=user)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_export_zip_with_resume_and_cover_letter():
    uid = uuid4()
    app = _fake_app(user_id=uid)
    user = SimpleNamespace(id=uid)

    resume_version = SimpleNamespace(
        source_file=None,
        content="Resume body text",
        content_format="plain_text",
    )
    cover_letter_version = SimpleNamespace(
        source_file=None,
        content="CL body text",
        content_format="plain_text",
    )
    resume_doc = SimpleNamespace(
        id=uuid4(),
        kind="resume",
        title="My Resume",
        head_version=resume_version,
        versions=[],
    )
    cover_letter_doc = SimpleNamespace(
        id=uuid4(),
        kind="cover_letter",
        title="My CL",
        head_version=cover_letter_version,
        versions=[],
    )
    resume_link = SimpleNamespace(document_id=resume_doc.id, version_id=None)
    cover_letter_link = SimpleNamespace(
        document_id=cover_letter_doc.id,
        version_id=None,
    )

    db = _FakeSession(
        [[resume_link, cover_letter_link], [resume_doc, cover_letter_doc]]
    )

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
    doc_id = uuid4()
    doc = SimpleNamespace(
        id=doc_id,
        kind="freeform",
        title="Uploaded Doc",
        head_version=head_version,
        versions=[],
    )
    link = SimpleNamespace(document_id=doc_id, version_id=None)

    db = _FakeSession([[link], [doc]])

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
    doc_id = uuid4()
    doc = SimpleNamespace(
        id=doc_id,
        kind="freeform",
        title="Text Doc",
        head_version=head_version,
        versions=[],
    )
    link = SimpleNamespace(document_id=doc_id, version_id=None)

    db = _FakeSession([[link], [doc]])

    response = await app_routes.export_application_materials(app=app, db=db, user=user)

    body = b""
    async for chunk in response.body_iterator:
        if isinstance(chunk, str):
            chunk = chunk.encode()
        body += chunk

    zf = zipfile.ZipFile(BytesIO(body))
    assert "documents/Text Doc.pdf" in zf.namelist()
    assert zf.read("documents/Text Doc.pdf")[:5] == b"%PDF-"


@pytest.mark.asyncio
async def test_export_zip_uses_fallback_names_when_none():
    uid = uuid4()
    app = _fake_app(user_id=uid)
    user = SimpleNamespace(id=uid)

    resume_version = SimpleNamespace(
        source_file=None,
        content="resume text",
        content_format="plain_text",
    )
    cover_letter_version = SimpleNamespace(
        source_file=None,
        content="cover letter text",
        content_format="plain_text",
    )
    head_version = SimpleNamespace(
        source_file=None,
        content="doc text",
        content_format="plain_text",
    )
    resume_id = uuid4()
    cover_letter_id = uuid4()
    resume_doc = SimpleNamespace(
        id=resume_id,
        kind="resume",
        title=None,
        head_version=resume_version,
        versions=[],
    )
    cover_letter_doc = SimpleNamespace(
        id=cover_letter_id,
        kind="cover_letter",
        title=None,
        head_version=cover_letter_version,
        versions=[],
    )
    doc_id = uuid4()
    doc = SimpleNamespace(
        id=doc_id,
        kind="freeform",
        title=None,
        head_version=head_version,
        versions=[],
    )
    links = [
        SimpleNamespace(document_id=resume_id, version_id=None),
        SimpleNamespace(document_id=cover_letter_id, version_id=None),
        SimpleNamespace(document_id=doc_id, version_id=None),
    ]

    db = _FakeSession([links, [resume_doc, cover_letter_doc, doc]])

    response = await app_routes.export_application_materials(app=app, db=db, user=user)

    body = b""
    async for chunk in response.body_iterator:
        if isinstance(chunk, str):
            chunk = chunk.encode()
        body += chunk

    zf = zipfile.ZipFile(BytesIO(body))
    names = zf.namelist()
    assert "resumes/document.pdf" in names
    assert "cover_letters/document.pdf" in names
    assert "documents/document.pdf" in names


@pytest.mark.asyncio
async def test_export_zip_document_source_file_value_error_falls_back():
    """resolve_document_source_path raises ValueError → fall back to content."""
    uid = uuid4()
    app = _fake_app(user_id=uid)
    user = SimpleNamespace(id=uid)

    head_version = SimpleNamespace(
        source_file="../../etc/passwd", content="safe content"
    )
    doc_id = uuid4()
    doc = SimpleNamespace(
        id=doc_id,
        kind="freeform",
        title="Bad Path Doc",
        head_version=head_version,
        versions=[],
    )
    link = SimpleNamespace(document_id=doc_id, version_id=None)

    db = _FakeSession([[link], [doc]])

    with patch.object(
        app_routes,
        "resolve_document_source_path",
        side_effect=ValueError("path outside uploads root"),
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
    assert "documents/Bad Path Doc.pdf" in zf.namelist()
    assert zf.read("documents/Bad Path Doc.pdf")[:5] == b"%PDF-"


@pytest.mark.asyncio
async def test_export_zip_document_source_file_missing_falls_back(tmp_path):
    """source_file is set but file does not exist → fall back to content."""
    uid = uuid4()
    app = _fake_app(user_id=uid)
    user = SimpleNamespace(id=uid)

    missing = tmp_path / "nonexistent.pdf"

    head_version = SimpleNamespace(
        source_file="uploads/missing.pdf", content="fallback content"
    )
    doc_id = uuid4()
    doc = SimpleNamespace(
        id=doc_id,
        kind="freeform",
        title="Missing File Doc",
        head_version=head_version,
        versions=[],
    )
    link = SimpleNamespace(document_id=doc_id, version_id=None)

    db = _FakeSession([[link], [doc]])

    with patch.object(
        app_routes,
        "resolve_document_source_path",
        return_value=missing,
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
    assert "documents/Missing File Doc.pdf" in zf.namelist()
    assert zf.read("documents/Missing File Doc.pdf")[:5] == b"%PDF-"


@pytest.mark.asyncio
async def test_export_zip_uses_pinned_document_version():
    uid = uuid4()
    app = _fake_app(user_id=uid)
    user = SimpleNamespace(id=uid)

    pinned_version = SimpleNamespace(
        id=uuid4(),
        source_file=None,
        content="Pinned version content",
        content_format="plain_text",
    )
    head_version = SimpleNamespace(
        id=uuid4(),
        source_file=None,
        content="Head version content",
        content_format="plain_text",
    )
    doc = SimpleNamespace(
        id=uuid4(),
        kind="freeform",
        title="Pinned Doc",
        head_version=head_version,
        versions=[pinned_version, head_version],
    )
    link = SimpleNamespace(document_id=doc.id, version_id=pinned_version.id)

    db = _FakeSession([[link], [doc]])

    with patch.object(
        app_routes,
        "_document_version_to_pdf",
        wraps=app_routes._document_version_to_pdf,
    ) as render_version:
        response = await app_routes.export_application_materials(
            app=app, db=db, user=user
        )
        body = b""
        async for chunk in response.body_iterator:
            if isinstance(chunk, str):
                chunk = chunk.encode()
            body += chunk

    assert body.startswith(b"PK")
    assert render_version.call_args[0][0] is pinned_version
