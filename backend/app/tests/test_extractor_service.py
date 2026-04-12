from datetime import datetime
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app import schemas
from app.core import conf
from app.core.document_storage import resolve_extractor_run_source_path
from app.core.extractor import service as extractor_service
from app.core.extractor_retry import FILE_SOURCE_PATH_KEY, SOURCE_KIND_KEY
from app.core.url_safety import UnsafeFetchUrlError
from app.tests import utils


def _build_extractor_schema(
    name: str,
    *,
    requires_approval: bool = False,
) -> schemas.ExtractorRead:
    return schemas.ExtractorRead(
        id=uuid4(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        name=name,
        description="Test extractor",
        instruction="Extract lead details",
        json_schema=schemas.LeadCreate.model_json_schema(),
        requires_approval=requires_approval,
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
        self.flush_count = 0
        self.get_calls = []

    async def get(self, model, id):
        self.get_calls.append((model, id))
        return self.event

    async def flush(self) -> None:
        self.flush_count += 1


@pytest.fixture(autouse=True)
def _configure_openai_for_service_tests(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(conf.openai, "API_KEY", "test-openai-key")


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
async def test_service_run_extractor_marks_event_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor_name = f"extractor-{utils.random_lower_string(8)}"
    extractor = _build_extractor_schema(extractor_name)
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor_name)
    created_event = SimpleNamespace(id=uuid4())
    captured_create_payload = None
    captured_update_payload = None
    current_user = user

    monkeypatch.setattr(extractor_service, "log", _FakeAsyncLogger())

    async def fake_extract_entire_document(text, extractor_schema, llm_name):
        assert text == "Example job description"
        assert extractor_schema.name == extractor_name
        assert llm_name == conf.openai.COMPLETION_MODEL
        return {
            "data": [{"url": "https://example.com/jobs/1", "title": "Engineer"}],
            "content_too_long": False,
        }

    async def fake_get_or_create_orchestration_pipeline(
        name,
        *,
        db,
        user,
        description,
        definition,
    ):
        assert name == extractor_name
        assert user.id == current_user.id
        assert description == f"Extraction orchestration pipeline for {extractor_name}"
        assert definition == extractor.json_schema
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

    monkeypatch.setattr(
        extractor_service,
        "extract_entire_document",
        fake_extract_entire_document,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "get_or_create_orchestration_pipeline",
        fake_get_or_create_orchestration_pipeline,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "create_orchestration_event",
        fake_create_orchestration_event,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "update_orchestration_event",
        fake_update_orchestration_event,
    )

    response = await extractor_service.run_extractor(
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
async def test_service_run_extractor_dispatches_retrieval_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor = _build_extractor_schema(f"extractor-{utils.random_lower_string(8)}")
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor.name)
    created_event = SimpleNamespace(id=uuid4())
    captured = {}

    monkeypatch.setattr(extractor_service, "log", _FakeAsyncLogger())

    async def fake_extract_from_content(text, extractor_schema, llm_name):
        captured["text"] = text
        captured["extractor_name"] = extractor_schema.name
        captured["llm_name"] = llm_name
        return {"data": [], "content_too_long": False}

    async def fake_get_or_create_orchestration_pipeline(
        name,
        *,
        db,
        user,
        description,
        definition,
    ):
        return pipeline

    async def fake_create_orchestration_event(payload, db):
        return created_event

    async def fake_update_orchestration_event(id, payload, db):
        return SimpleNamespace(id=id)

    monkeypatch.setattr(
        extractor_service,
        "extract_from_content",
        fake_extract_from_content,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "get_or_create_orchestration_pipeline",
        fake_get_or_create_orchestration_pipeline,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "create_orchestration_event",
        fake_create_orchestration_event,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "update_orchestration_event",
        fake_update_orchestration_event,
    )

    response = await extractor_service.run_extractor(
        extractor,
        schemas.ExtractorRun(mode="retrieval", text="Sectioned profile text"),
        user,
        _FakeDB(),
    )

    assert response.data == []
    assert captured == {
        "text": "Sectioned profile text",
        "extractor_name": extractor.name,
        "llm_name": conf.openai.COMPLETION_MODEL,
    }


@pytest.mark.asyncio
async def test_service_run_extractor_returns_422_for_unsafe_redirect_target(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor = _build_extractor_schema(f"extractor-{utils.random_lower_string(8)}")
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor.name)

    monkeypatch.setattr(extractor_service, "log", _FakeAsyncLogger())

    async def fake_get_or_create_orchestration_pipeline(
        name,
        *,
        db,
        user,
        description,
        definition,
    ):
        return pipeline

    async def fake_extract_text_from_url(url: str) -> str:
        raise UnsafeFetchUrlError(
            "Fetch URL redirect target 'http://127.0.0.1/internal' is unsafe"
        )

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("orchestration event should not be created")

    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "get_or_create_orchestration_pipeline",
        fake_get_or_create_orchestration_pipeline,
    )
    monkeypatch.setattr(
        extractor_service,
        "extract_text_from_url",
        fake_extract_text_from_url,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "create_orchestration_event",
        fail_if_called,
    )

    with pytest.raises(HTTPException) as exc_info:
        await extractor_service.run_extractor(
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


@pytest.mark.asyncio
async def test_service_run_extractor_persists_file_snapshot_and_retry_link(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    extractor = _build_extractor_schema(f"extractor-{utils.random_lower_string(8)}")
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor.name)
    created_event = SimpleNamespace(id=uuid4())
    event_obj = SimpleNamespace(
        id=created_event.id,
        retry_of_id=None,
        version_hash=None,
    )
    retry_of_id = uuid4()
    captured_create_payload = None

    monkeypatch.setattr(extractor_service, "log", _FakeAsyncLogger())
    monkeypatch.setattr(conf.settings, "PUBLIC_ASSETS_DIR", str(tmp_path))

    async def fake_extract_entire_document(text, extractor_schema, llm_name):
        assert text == "Resume body"
        return {"data": [], "content_too_long": False}

    async def fake_get_or_create_orchestration_pipeline(
        name,
        *,
        db,
        user,
        description,
        definition,
    ):
        return pipeline

    async def fake_create_orchestration_event(payload, db):
        nonlocal captured_create_payload
        captured_create_payload = payload
        return created_event

    async def fake_update_orchestration_event(id, payload, db):
        return SimpleNamespace(id=id)

    monkeypatch.setattr(
        extractor_service,
        "extract_entire_document",
        fake_extract_entire_document,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "get_or_create_orchestration_pipeline",
        fake_get_or_create_orchestration_pipeline,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "create_orchestration_event",
        fake_create_orchestration_event,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "update_orchestration_event",
        fake_update_orchestration_event,
    )
    monkeypatch.setattr(
        extractor_service,
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

    await extractor_service.run_extractor(
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
async def test_service_run_extractor_marks_pending_review_when_approval_required(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor = _build_extractor_schema(
        f"extractor-{utils.random_lower_string(8)}",
        requires_approval=True,
    )
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor.name)
    created_event = SimpleNamespace(id=uuid4())
    captured_update_payload = None

    monkeypatch.setattr(extractor_service, "log", _FakeAsyncLogger())

    async def fake_extract_entire_document(text, extractor_schema, llm_name):
        return {"data": [{"field": "value"}], "content_too_long": False}

    async def fake_get_or_create_orchestration_pipeline(
        name,
        *,
        db,
        user,
        description,
        definition,
    ):
        return pipeline

    async def fake_create_orchestration_event(payload, db):
        return created_event

    async def fake_update_orchestration_event(id, payload, db):
        nonlocal captured_update_payload
        captured_update_payload = payload
        return SimpleNamespace(id=id)

    monkeypatch.setattr(
        extractor_service,
        "extract_entire_document",
        fake_extract_entire_document,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "get_or_create_orchestration_pipeline",
        fake_get_or_create_orchestration_pipeline,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "create_orchestration_event",
        fake_create_orchestration_event,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "update_orchestration_event",
        fake_update_orchestration_event,
    )

    response = await extractor_service.run_extractor(
        extractor,
        schemas.ExtractorRun(mode="entire_document", text="Review me"),
        user,
        _FakeDB(),
    )

    assert response.data == [{"field": "value"}]
    assert captured_update_payload is not None
    assert (
        captured_update_payload.status
        == schemas.OrchestrationEventStatusType.PENDING_REVIEW
    )
    assert "held for review" in captured_update_payload.message


@pytest.mark.asyncio
async def test_service_run_extractor_preserves_original_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor = _build_extractor_schema(f"extractor-{utils.random_lower_string(8)}")
    user = SimpleNamespace(id=uuid4())
    pipeline = SimpleNamespace(id=uuid4(), name=extractor.name)
    created_event = SimpleNamespace(id=uuid4())
    captured_update_payload = None

    monkeypatch.setattr(extractor_service, "log", _FakeAsyncLogger())

    async def fake_extract_entire_document(text, extractor_schema, llm_name):
        raise RuntimeError("tokenizer boom")

    async def fake_get_or_create_orchestration_pipeline(
        name,
        *,
        db,
        user,
        description,
        definition,
    ):
        return pipeline

    async def fake_create_orchestration_event(payload, db):
        return created_event

    async def fake_update_orchestration_event(id, payload, db):
        nonlocal captured_update_payload
        assert id == created_event.id
        captured_update_payload = payload
        return SimpleNamespace(id=id)

    monkeypatch.setattr(
        extractor_service,
        "extract_entire_document",
        fake_extract_entire_document,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "get_or_create_orchestration_pipeline",
        fake_get_or_create_orchestration_pipeline,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "create_orchestration_event",
        fake_create_orchestration_event,
    )
    monkeypatch.setattr(
        extractor_service.orchestration_core,
        "update_orchestration_event",
        fake_update_orchestration_event,
    )

    with pytest.raises(HTTPException) as exc_info:
        await extractor_service.run_extractor(
            extractor,
            schemas.ExtractorRun(
                mode="entire_document",
                text="Example job description",
            ),
            user,
            _FakeDB(),
        )

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "tokenizer boom"
    assert captured_update_payload is not None
    assert captured_update_payload.status == schemas.OrchestrationEventStatusType.FAILED
    assert captured_update_payload.message == (
        f"Failure running extractor {extractor.name}: RuntimeError: tokenizer boom"
    )


@pytest.mark.asyncio
async def test_service_run_extractor_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor = _build_extractor_schema(f"extractor-{utils.random_lower_string(8)}")
    user = SimpleNamespace(id=uuid4())

    monkeypatch.setattr(extractor_service, "log", _FakeAsyncLogger())
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    with pytest.raises(HTTPException) as exc_info:
        await extractor_service.run_extractor(
            extractor,
            schemas.ExtractorRun(
                mode="entire_document",
                text="Example job description",
            ),
            user,
            _FakeDB(),
        )

    assert exc_info.value.status_code == 503
    assert (
        exc_info.value.detail
        == "Extractor execution is disabled because OPENAI_API_KEY is not configured."
    )
