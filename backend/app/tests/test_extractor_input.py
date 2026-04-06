import builtins
import io

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

from app import schemas
from app.api.deps import get_extractor_run_payload
from app.extractor import parsing


def _build_test_app() -> FastAPI:
    app = FastAPI()

    @app.post("/extract")
    async def extract(
        payload: schemas.ExtractorRun = Depends(get_extractor_run_payload),
    ) -> dict[str, str | bool | None]:
        return {
            "mode": payload.mode,
            "text": payload.text,
            "url": str(payload.url) if payload.url else None,
            "llm": payload.llm,
            "has_file": payload.file is not None,
            "filename": payload.file.filename if payload.file else None,
            "content_type": payload.file.content_type if payload.file else None,
        }

    return app


@pytest.mark.asyncio
async def test_get_extractor_run_payload_accepts_json_body() -> None:
    app = _build_test_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/extract",
            json={
                "mode": "retrieval",
                "text": "Python and SQL",
                "url": "https://example.com/resume",
                "llm": "gpt-4o-mini",
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "mode": "retrieval",
        "text": "Python and SQL",
        "url": "https://example.com/resume",
        "llm": "gpt-4o-mini",
        "has_file": False,
        "filename": None,
        "content_type": None,
    }


@pytest.mark.asyncio
async def test_get_extractor_run_payload_accepts_multipart_form() -> None:
    app = _build_test_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/extract",
            data={
                "mode": "entire_document",
                "text": "null",
                "url": "https://example.com/resume",
                "llm": "",
            },
            files={
                "file": (
                    "resume.tex",
                    b"\\section{Skills}\nPython\nSQL\n",
                    "application/x-tex",
                )
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "mode": "entire_document",
        "text": None,
        "url": "https://example.com/resume",
        "llm": None,
        "has_file": True,
        "filename": "resume.tex",
        "content_type": "application/x-tex",
    }


def test_guess_mimetype_falls_back_when_magic_is_unavailable(monkeypatch) -> None:
    original_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "magic":
            raise ImportError("libmagic is not installed")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)

    assert (
        parsing._guess_mimetype(b"%PDF-1.7\n", file_name="resume.pdf")
        == "application/pdf"
    )


def test_parse_binary_input_supports_tex_uploads() -> None:
    data = io.BytesIO(b"\\section{Skills}\nPython\nSQL\n")
    data.name = "resume.tex"  # type: ignore[attr-defined]

    documents = parsing.parse_binary_input(
        data,
        file_name="resume.tex",
        content_type="application/x-tex",
    )

    assert len(documents) == 1
    assert "Python" in documents[0].page_content


@pytest.mark.asyncio
async def test_get_extractor_run_payload_rejects_unsafe_url() -> None:
    app = _build_test_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/extract",
            json={
                "mode": "entire_document",
                "url": "http://127.0.0.1/internal",
            },
        )

    assert response.status_code == 422
    assert any(error["loc"][-1] == "url" for error in response.json().get("detail", []))
