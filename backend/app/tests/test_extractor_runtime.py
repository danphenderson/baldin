from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app import schemas
from app.api import deps
from app.core import conf
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
        self.refresh_count = 0
        self.get_calls = []

    async def get(self, model, id):
        self.get_calls.append((model, id))
        return self.event

    async def commit(self) -> None:
        self.commit_count += 1

    async def refresh(self, event) -> None:
        self.refresh_count += 1


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
