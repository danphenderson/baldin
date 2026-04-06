from datetime import datetime
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app import schemas
from app.api import deps
from app.core import conf
from app.core.document_storage import resolve_extractor_run_source_path
from app.core.extractor_retry import FILE_SOURCE_PATH_KEY, SOURCE_KIND_KEY
from app.core.url_safety import UnsafeFetchUrlError
from app.extractor import extraction_runnable as extraction_module
from app.tests import utils


def _build_extractor_schema(name: str) -> schemas.ExtractorRead:
    return schemas.ExtractorRead(
        id=uuid4(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        name=name,
        description="Test extractor",
        instruction="Extract lead details",
        json_schema=schemas.LeadCreate.model_json_schema(),
        extractor_examples=[],
    )


class _FakeAsyncLogger:
    async def info(self, *args, **kwargs) -> None:
        return None

    async def exception(self, *args, **kwargs) -> None:
        return None


class _FakeDB:
    def __init__(self, event=None):
        self.event = event
        self.commit_count = 0
        self.flush_count = 0
        self.refresh_count = 0
        self.get_calls = []

    async def get(self, model, id):
        self.get_calls.append((model, id))
        return self.event

    async def commit(self) -> None:
        self.commit_count += 1

    async def flush(self) -> None:
        self.flush_count += 1

    async def refresh(self, event) -> None:
        self.refresh_count += 1


def _build_upload_file(
    *,
    file_name: str,
    file_bytes: bytes,
    content_type: str,
) -> UploadFile:
    return UploadFile(
        file=BytesIO(file_bytes),
        filename=file_name,
        headers=Headers({"content-type": content_type}),
    )


@pytest.mark.asyncio
async def test_extract_entire_document_uses_explicit_tokenizer_encoding(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_splitter_kwargs: dict[str, object] = {}

    class FakeTokenTextSplitter:
        def __init__(self, **kwargs):
            captured_splitter_kwargs.update(kwargs)

        def split_text(self, content: str) -> list[str]:
            return [content]

    class FakeExtractionRunnable:
        async def abatch(self, requests, config):
            return [{"data": []}]

    monkeypatch.setattr(extraction_module, "TokenTextSplitter", FakeTokenTextSplitter)
    monkeypatch.setattr(
        extraction_module,
        "extraction_runnable",
        FakeExtractionRunnable(),
    )

    result = await extraction_module.extract_entire_document(
        "Example job description",
        _build_extractor_schema(f"extractor-{utils.random_lower_string(8)}"),
        "gpt-5.4-mini-2026-03-17",
    )

    assert result == {"data": [], "content_too_long": False}
    assert captured_splitter_kwargs["chunk_size"] == conf.openai.get_chunk_size(
        "gpt-5.4-mini-2026-03-17"
    )
    assert captured_splitter_kwargs["chunk_overlap"] == 20
    assert captured_splitter_kwargs["encoding_name"] == "o200k_base"
    assert "model_name" not in captured_splitter_kwargs


@pytest.mark.asyncio
async def test_update_orchestration_event_updates_by_primary_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    event = SimpleNamespace(id=uuid4(), status="pending", message="before")
    db = _FakeDB(event=event)

    monkeypatch.setattr(deps, "log", _FakeAsyncLogger())

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("get_orchestration_event should not be called")

    monkeypatch.setattr(deps, "get_orchestration_event", fail_if_called)

    updated = await deps.update_orchestration_event(
        event.id,
        schemas.OrchestrationEventUpdate(
            message="after",
            status=schemas.OrchestrationEventStatusType.SUCCESS,
        ),
        db,
    )

    assert updated is event
    assert event.message == "after"
    assert event.status == schemas.OrchestrationEventStatusType.SUCCESS
    assert db.get_calls == [(deps.models.OrchestrationEvent, event.id)]
    assert db.commit_count == 1
    assert db.refresh_count == 1


@pytest.mark.asyncio
async def test_run_extractor_marks_event_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor_name = f"extractor-{utils.random_lower_string(8)}"
    extractor = _build_extractor_schema(extractor_name)
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor_name)
    created_event = SimpleNamespace(id=uuid4())
    captured_create_payload = None
    captured_update_payload = None

    monkeypatch.setattr(deps, "log", _FakeAsyncLogger())

    async def fake_extract_entire_document(text, extractor_schema, llm_name):
        assert text == "Example job description"
        assert extractor_schema.name == extractor_name
        assert llm_name == conf.openai.COMPLETION_MODEL
        return {
            "data": [{"url": "https://example.com/jobs/1", "title": "Engineer"}],
            "content_too_long": False,
        }

    async def fake_get_orchestration_pipeline_by_name(name, db, current_user):
        assert name == extractor_name
        assert current_user.id == user.id
        return pipeline

    async def fake_create_orchestration_event(payload, db):
        nonlocal captured_create_payload
        captured_create_payload = payload
        return created_event

    async def fake_update_orchestration_event(id, payload, db):
        nonlocal captured_update_payload
        assert id == created_event.id
        captured_update_payload = payload
        return SimpleNamespace(id=id)

    monkeypatch.setattr(deps, "extract_entire_document", fake_extract_entire_document)
    monkeypatch.setattr(
        deps,
        "get_orchestration_pipeline_by_name",
        fake_get_orchestration_pipeline_by_name,
    )
    monkeypatch.setattr(
        deps, "create_orchestration_event", fake_create_orchestration_event
    )
    monkeypatch.setattr(
        deps, "update_orchestration_event", fake_update_orchestration_event
    )

    response = await deps.run_extractor(
        extractor,
        schemas.ExtractorRun(mode="entire_document", text="Example job description"),
        user,
        _FakeDB(),
    )

    assert response.data == [{"url": "https://example.com/jobs/1", "title": "Engineer"}]
    assert response.content_too_long is False
    assert captured_create_payload is not None
    assert (
        captured_create_payload.status == schemas.OrchestrationEventStatusType.RUNNING
    )
    assert captured_create_payload.payload[SOURCE_KIND_KEY] == "text"
    assert captured_create_payload.payload["text"] == "Example job description"
    assert captured_update_payload is not None
    assert (
        captured_update_payload.status == schemas.OrchestrationEventStatusType.SUCCESS
    )
    assert "Success! Extracted res:" in captured_update_payload.message


@pytest.mark.asyncio
async def test_run_extractor_preserves_original_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor_name = f"extractor-{utils.random_lower_string(8)}"
    extractor = _build_extractor_schema(extractor_name)
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor_name)
    created_event = SimpleNamespace(id=uuid4())
    captured_update_payload = None

    monkeypatch.setattr(deps, "log", _FakeAsyncLogger())

    async def fake_extract_entire_document(text, extractor_schema, llm_name):
        raise RuntimeError("tokenizer boom")

    async def fake_get_orchestration_pipeline_by_name(name, db, current_user):
        return pipeline

    async def fake_create_orchestration_event(payload, db):
        return created_event

    async def fake_update_orchestration_event(id, payload, db):
        nonlocal captured_update_payload
        assert id == created_event.id
        captured_update_payload = payload
        return SimpleNamespace(id=id)

    monkeypatch.setattr(deps, "extract_entire_document", fake_extract_entire_document)
    monkeypatch.setattr(
        deps,
        "get_orchestration_pipeline_by_name",
        fake_get_orchestration_pipeline_by_name,
    )
    monkeypatch.setattr(
        deps, "create_orchestration_event", fake_create_orchestration_event
    )
    monkeypatch.setattr(
        deps, "update_orchestration_event", fake_update_orchestration_event
    )

    with pytest.raises(HTTPException) as exc_info:
        await deps.run_extractor(
            extractor,
            schemas.ExtractorRun(
                mode="entire_document", text="Example job description"
            ),
            user,
            _FakeDB(),
        )

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "tokenizer boom"
    assert captured_update_payload is not None
    assert captured_update_payload.status == schemas.OrchestrationEventStatusType.FAILED
    assert captured_update_payload.message == (
        f"Failure running extractor {extractor_name}: RuntimeError: tokenizer boom"
    )


@pytest.mark.asyncio
async def test_run_extractor_persists_original_url_in_event_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor_name = f"extractor-{utils.random_lower_string(8)}"
    extractor = _build_extractor_schema(extractor_name)
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor_name)
    created_event = SimpleNamespace(id=uuid4())
    captured_create_payload = None

    monkeypatch.setattr(deps, "log", _FakeAsyncLogger())

    async def fake_extract_text_from_url(url: str) -> str:
        assert url == "https://example.com/profile"
        return "Fetched profile text"

    async def fake_extract_entire_document(text, extractor_schema, llm_name):
        assert text == "Fetched profile text"
        return {"data": [], "content_too_long": False}

    async def fake_get_orchestration_pipeline_by_name(name, db, current_user):
        return pipeline

    async def fake_create_orchestration_event(payload, db):
        nonlocal captured_create_payload
        captured_create_payload = payload
        return created_event

    async def fake_update_orchestration_event(id, payload, db):
        return SimpleNamespace(id=id)

    monkeypatch.setattr(deps, "extract_text_from_url", fake_extract_text_from_url)
    monkeypatch.setattr(deps, "extract_entire_document", fake_extract_entire_document)
    monkeypatch.setattr(
        deps,
        "get_orchestration_pipeline_by_name",
        fake_get_orchestration_pipeline_by_name,
    )
    monkeypatch.setattr(
        deps, "create_orchestration_event", fake_create_orchestration_event
    )
    monkeypatch.setattr(
        deps, "update_orchestration_event", fake_update_orchestration_event
    )

    await deps.run_extractor(
        extractor,
        schemas.ExtractorRun(
            mode="entire_document",
            url="https://example.com/profile",
        ),
        user,
        _FakeDB(),
    )

    assert captured_create_payload is not None
    assert captured_create_payload.payload[SOURCE_KIND_KEY] == "url"
    assert captured_create_payload.payload["url"] == "https://example.com/profile"
    assert captured_create_payload.payload["text"] is None
    assert captured_create_payload.source_uri.name == "https://example.com/profile"
    assert captured_create_payload.source_uri.type == schemas.URIType.URL


@pytest.mark.asyncio
async def test_run_extractor_persists_file_snapshot_and_retry_link(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    extractor_name = f"extractor-{utils.random_lower_string(8)}"
    extractor = _build_extractor_schema(extractor_name)
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor_name)
    created_event = SimpleNamespace(id=uuid4())
    event_obj = SimpleNamespace(
        id=created_event.id, retry_of_id=None, version_hash=None
    )
    retry_of_id = uuid4()
    captured_create_payload = None

    monkeypatch.setattr(deps, "log", _FakeAsyncLogger())
    monkeypatch.setattr(conf.settings, "PUBLIC_ASSETS_DIR", str(tmp_path))

    async def fake_extract_entire_document(text, extractor_schema, llm_name):
        assert text == "Resume body"
        return {"data": [], "content_too_long": False}

    async def fake_get_orchestration_pipeline_by_name(name, db, current_user):
        return pipeline

    async def fake_create_orchestration_event(payload, db):
        nonlocal captured_create_payload
        captured_create_payload = payload
        return created_event

    async def fake_update_orchestration_event(id, payload, db):
        return SimpleNamespace(id=id)

    monkeypatch.setattr(deps, "extract_entire_document", fake_extract_entire_document)
    monkeypatch.setattr(
        deps,
        "get_orchestration_pipeline_by_name",
        fake_get_orchestration_pipeline_by_name,
    )
    monkeypatch.setattr(
        deps, "create_orchestration_event", fake_create_orchestration_event
    )
    monkeypatch.setattr(
        deps, "update_orchestration_event", fake_update_orchestration_event
    )
    monkeypatch.setattr(
        deps,
        "parse_binary_input",
        lambda data, file_name, content_type: [
            SimpleNamespace(page_content="Resume body")
        ],
    )

    upload = _build_upload_file(
        file_name="resume.txt",
        file_bytes=b"Resume body",
        content_type="text/plain",
    )
    await deps.run_extractor(
        extractor,
        schemas.ExtractorRun(mode="entire_document", file=upload),
        user,
        _FakeDB(event=event_obj),
        retry_of_id=retry_of_id,
    )

    assert captured_create_payload is not None
    assert captured_create_payload.payload[SOURCE_KIND_KEY] == "file"
    assert captured_create_payload.payload["file"] == "resume.txt"
    stored_path = captured_create_payload.payload[FILE_SOURCE_PATH_KEY]
    assert isinstance(stored_path, str)
    assert captured_create_payload.source_uri.name == stored_path
    assert captured_create_payload.source_uri.type == schemas.URIType.FILE

    absolute_path = resolve_extractor_run_source_path(stored_path)
    assert absolute_path.exists()
    assert absolute_path.read_bytes() == b"Resume body"
    assert event_obj.retry_of_id == retry_of_id
    assert event_obj.version_hash


@pytest.mark.asyncio
async def test_run_extractor_returns_422_for_unsafe_redirect_target(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor_name = f"extractor-{utils.random_lower_string(8)}"
    extractor = _build_extractor_schema(extractor_name)
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor_name)

    monkeypatch.setattr(deps, "log", _FakeAsyncLogger())

    async def fake_get_orchestration_pipeline_by_name(name, db, current_user):
        return pipeline

    async def fake_extract_text_from_url(url: str) -> str:
        raise UnsafeFetchUrlError(
            "Fetch URL redirect target 'http://127.0.0.1/internal' is unsafe"
        )

    monkeypatch.setattr(
        deps,
        "get_orchestration_pipeline_by_name",
        fake_get_orchestration_pipeline_by_name,
    )
    monkeypatch.setattr(deps, "extract_text_from_url", fake_extract_text_from_url)

    with pytest.raises(HTTPException) as exc_info:
        await deps.run_extractor(
            extractor,
            schemas.ExtractorRun(
                mode="entire_document",
                url="https://example.com/profile",
            ),
            user,
            _FakeDB(),
        )

    assert exc_info.value.status_code == 422
    assert "redirect target" in str(exc_info.value.detail)
