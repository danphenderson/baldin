from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.core import orchestration


class _FakeAsyncLogger:
    async def info(self, *args, **kwargs) -> None:
        return None


class _FakeDB:
    def __init__(self, *, commit_error: Exception | None = None):
        self.commit_error = commit_error
        self.added: list[object] = []
        self.commit_count = 0
        self.rollback_count = 0
        self.refresh_count = 0

    def add(self, value: object) -> None:
        self.added.append(value)

    async def commit(self) -> None:
        self.commit_count += 1
        if self.commit_error is not None:
            raise self.commit_error

    async def rollback(self) -> None:
        self.rollback_count += 1

    async def refresh(self, value: object) -> None:
        del value
        self.refresh_count += 1


@pytest.mark.asyncio
async def test_get_or_create_orchestration_pipeline_recovers_from_duplicate_insert(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = SimpleNamespace(id=uuid4())
    existing_pipeline = SimpleNamespace(id=uuid4(), name="rag.enrich_lead")
    db = _FakeDB(
        commit_error=IntegrityError(
            "insert into orchestration_pipelines", {}, Exception("duplicate key")
        )
    )
    lookup_calls: list[tuple[str, object, object]] = []

    async def _fake_lookup(name: str, db_arg, user_arg):
        lookup_calls.append((name, db_arg, user_arg))
        if len(lookup_calls) == 1:
            raise HTTPException(status_code=404, detail="missing")
        return existing_pipeline

    monkeypatch.setattr(
        orchestration, "get_orchestration_pipeline_by_name", _fake_lookup
    )
    monkeypatch.setattr(orchestration, "log", _FakeAsyncLogger())

    pipeline = await orchestration.get_or_create_orchestration_pipeline(
        "rag.enrich_lead",
        db=db,
        user=user,
        description="LangGraph orchestration pipeline for lead enrichment",
        definition={"kind": "langgraph"},
    )

    assert pipeline is existing_pipeline
    assert db.commit_count == 1
    assert db.rollback_count == 1
    assert db.refresh_count == 0
    assert len(db.added) == 1
    assert lookup_calls == [
        ("rag.enrich_lead", db, user),
        ("rag.enrich_lead", db, user),
    ]
