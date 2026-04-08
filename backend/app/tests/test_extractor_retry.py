from types import SimpleNamespace
from uuid import uuid4

import pytest

from app import schemas
from app.api.routes import data_orchestration as data_orchestration_route
from app.api.routes import extractor as extractor_route
from app.core import conf
from app.core.document_storage import (
    build_extractor_run_source_path,
    resolve_extractor_run_source_path,
    save_extractor_run_source_file,
)
from app.core.extractor_retry import (
    FILE_CONTENT_TYPE_KEY,
    FILE_SOURCE_PATH_KEY,
    SOURCE_KIND_KEY,
)


class _FakeScalarResult:
    def __init__(self, items):
        self._items = items

    def first(self):
        return self._items[0] if self._items else None

    def all(self):
        return list(self._items)


class _FakeExecuteResult:
    def __init__(self, items=None, rowcount=0):
        self._items = items or []
        self.rowcount = rowcount

    def scalars(self):
        return _FakeScalarResult(self._items)


class _QueuedDB:
    def __init__(self, results):
        self._results = list(results)
        self.commit_count = 0

    async def execute(self, query):
        return self._results.pop(0)

    async def commit(self):
        self.commit_count += 1


@pytest.mark.asyncio
async def test_retry_extractor_run_rehydrates_url_payload(monkeypatch) -> None:
    event_id = uuid4()
    extractor = SimpleNamespace(id=uuid4(), name="Extractor")
    user = SimpleNamespace(id=uuid4())
    event = SimpleNamespace(
        id=event_id,
        status="failure",
        payload={
            "mode": "retrieval",
            "llm": "gpt-4o-mini",
            SOURCE_KIND_KEY: "url",
            "url": "https://example.com/profile",
        },
    )
    db = _QueuedDB(
        [
            _FakeExecuteResult([event]),
            _FakeExecuteResult([]),
        ]
    )
    captured = {}

    async def fake_run_extractor(
        extractor_arg,
        payload,
        user_arg,
        db_arg,
        retry_of_id=None,
    ):
        captured["url"] = str(payload.url) if payload.url else None
        captured["mode"] = payload.mode
        captured["llm"] = payload.llm
        captured["retry_of_id"] = retry_of_id
        return schemas.ExtractorResponse(data=[], content_too_long=False)

    monkeypatch.setattr(extractor_route, "run_extractor", fake_run_extractor)

    response = await extractor_route.retry_extractor_run(event_id, extractor, db, user)

    assert response.data == []
    assert captured == {
        "url": "https://example.com/profile",
        "mode": "retrieval",
        "llm": "gpt-4o-mini",
        "retry_of_id": event_id,
    }


@pytest.mark.asyncio
async def test_retry_extractor_run_rehydrates_file_payload(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setattr(conf.settings, "PUBLIC_ASSETS_DIR", str(tmp_path))

    event_id = uuid4()
    extractor = SimpleNamespace(id=uuid4(), name="Extractor")
    user = SimpleNamespace(id=uuid4())
    relative_path = build_extractor_run_source_path(
        user.id,
        uuid4(),
        file_name="resume.txt",
    )
    save_extractor_run_source_file(relative_path, b"Resume body")
    event = SimpleNamespace(
        id=event_id,
        status="failure",
        payload={
            "mode": "entire_document",
            "llm": None,
            SOURCE_KIND_KEY: "file",
            "file": "resume.txt",
            FILE_CONTENT_TYPE_KEY: "text/plain",
            FILE_SOURCE_PATH_KEY: relative_path,
        },
    )
    db = _QueuedDB(
        [
            _FakeExecuteResult([event]),
            _FakeExecuteResult([]),
        ]
    )
    captured = {}

    async def fake_run_extractor(
        extractor_arg,
        payload,
        user_arg,
        db_arg,
        retry_of_id=None,
    ):
        captured["filename"] = payload.file.filename if payload.file else None
        captured["content_type"] = payload.file.content_type if payload.file else None
        captured["file_bytes"] = await payload.file.read() if payload.file else None
        captured["retry_of_id"] = retry_of_id
        return schemas.ExtractorResponse(data=[], content_too_long=False)

    monkeypatch.setattr(extractor_route, "run_extractor", fake_run_extractor)

    response = await extractor_route.retry_extractor_run(event_id, extractor, db, user)

    assert response.data == []
    assert captured == {
        "filename": "resume.txt",
        "content_type": "text/plain",
        "file_bytes": b"Resume body",
        "retry_of_id": event_id,
    }


@pytest.mark.asyncio
async def test_prune_orchestration_events_removes_stored_extractor_snapshots(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setattr(conf.settings, "PUBLIC_ASSETS_DIR", str(tmp_path))

    relative_path = build_extractor_run_source_path(
        uuid4(),
        uuid4(),
        file_name="resume.txt",
    )
    save_extractor_run_source_file(relative_path, b"Resume body")
    absolute_path = resolve_extractor_run_source_path(relative_path)
    event = SimpleNamespace(
        id=uuid4(),
        payload={
            SOURCE_KIND_KEY: "file",
            FILE_SOURCE_PATH_KEY: relative_path,
        },
    )
    db = _QueuedDB(
        [
            _FakeExecuteResult([event]),
            _FakeExecuteResult(rowcount=1),
        ]
    )

    result = await data_orchestration_route.prune_orchestration_events(
        older_than_days=30,
        db=db,
    )

    assert result == {"deleted": 1}
    assert db.commit_count == 1
    assert not absolute_path.exists()
    assert not absolute_path.parent.exists()
