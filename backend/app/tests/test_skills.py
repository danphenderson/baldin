from contextlib import asynccontextmanager
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import BackgroundTasks, HTTPException
from httpx import ASGITransport, AsyncClient
from starlette.requests import Request

from app import models, schemas
from app.api import deps
from app.api.routes import skills as skills_route
from app.core import conf
from app.main import app

pytestmark = pytest.mark.asyncio(loop_scope="module")


@asynccontextmanager
async def _client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


def _skill_payload(**overrides) -> dict:
    payload = {
        "name": "Python",
        "category": "Programming",
        "yoe": 5,
        "subskills": ["asyncio", "fastapi"],
    }
    payload.update(overrides)
    return payload


def _skill_model(*, user_id, **overrides) -> models.Skill:
    now = datetime.now(UTC)
    payload = _skill_payload(**overrides)
    return models.Skill(
        id=uuid4(),
        created_at=now,
        updated_at=now,
        user_id=user_id,
        **payload,
    )


class _ScalarResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class _ExecuteResult:
    def __init__(self, *, items=None, count=None):
        self._items = items or []
        self._count = count

    def scalar_one(self):
        return self._count

    def scalars(self):
        return _ScalarResult(self._items)


class _FakeSkillSession:
    def __init__(self, skills=None) -> None:
        self.skills = {skill.id: skill for skill in skills or []}

    def add(self, skill: models.Skill) -> None:
        now = datetime.now(UTC)
        if getattr(skill, "id", None) is None:
            skill.id = uuid4()
        if getattr(skill, "created_at", None) is None:
            skill.created_at = now
        skill.updated_at = now
        self.skills[skill.id] = skill

    async def commit(self) -> None:
        return None

    async def refresh(self, skill: models.Skill) -> None:
        skill.updated_at = datetime.now(UTC)

    async def get(self, model, id):
        del model
        return self.skills.get(id)

    async def delete(self, skill: models.Skill) -> None:
        self.skills.pop(skill.id, None)

    async def execute(self, stmt):
        params = stmt.compile().params
        user_id = params.get("user_id_1")
        items = [
            skill
            for skill in self.skills.values()
            if user_id is None or skill.user_id == user_id
        ]
        items.sort(key=lambda skill: skill.created_at)
        if "count(*)" in str(stmt):
            return _ExecuteResult(count=len(items))
        limit = params.get("param_1")
        offset = params.get("param_2", 0)
        return _ExecuteResult(items=items[offset : offset + limit])


def _extract_request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/skills/extract",
            "headers": [],
            "query_string": b"",
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "http",
        }
    )


@pytest.mark.parametrize(
    ("method", "path", "json"),
    [
        ("get", "/api/v1/skills/", None),
        ("post", "/api/v1/skills/", _skill_payload()),
        ("get", f"/api/v1/skills/{uuid4()}", None),
    ],
)
async def test_skills_routes_require_authentication(
    method: str,
    path: str,
    json: dict | None,
) -> None:
    async with _client() as client:
        response = await client.request(method, path, json=json)

    assert response.status_code == 401


async def test_skills_crud_list_and_scoping() -> None:
    owner = SimpleNamespace(id=uuid4())
    other = SimpleNamespace(id=uuid4())
    other_skill = _skill_model(user_id=other.id, name="Rust", category="Systems")
    db = _FakeSkillSession(skills=[other_skill])

    created_one = await skills_route.create_user_skill(
        payload=schemas.SkillCreate(**_skill_payload(name="Python")),
        user=owner,
        db=db,
    )
    created_two = await skills_route.create_user_skill(
        payload=schemas.SkillCreate(
            **_skill_payload(name="SQL", yoe=3, subskills=["postgres"])
        ),
        user=owner,
        db=db,
    )
    listed = await skills_route.get_current_user_skills(
        user=owner,
        db=db,
        page=1,
        page_size=1,
    )
    fetched = await deps.get_skill(created_one.id, db=db, user=owner)

    with pytest.raises(HTTPException) as exc_info:
        await deps.get_skill(other_skill.id, db=db, user=owner)

    assert created_one.user_id == owner.id
    assert created_two.user_id == owner.id
    assert listed.total == 2
    assert listed.page == 1
    assert listed.page_size == 1
    assert len(listed.items) == 1
    assert listed.items[0].name == "Python"
    assert fetched.id == created_one.id
    assert exc_info.value.status_code == 403


async def test_skill_update_and_delete_lifecycle() -> None:
    owner = SimpleNamespace(id=uuid4())
    db = _FakeSkillSession()

    created = await skills_route.create_user_skill(
        payload=schemas.SkillCreate(**_skill_payload(name="Data Analysis", yoe=2)),
        user=owner,
        db=db,
    )
    updated = await skills_route.update_user_skill(
        payload=schemas.SkillUpdate(yoe=4, subskills=["sql", "dashboards"]),
        skill=created,
        db=db,
    )
    deleted = await skills_route.delete_user_skill(skill=created, db=db)

    with pytest.raises(HTTPException) as exc_info:
        await deps.get_skill(created.id, db=db, user=owner)

    assert updated.yoe == 4
    assert updated.subskills == ["sql", "dashboards"]
    assert deleted is None
    assert exc_info.value.status_code == 404


async def test_extract_user_skills_creates_missing_extractor_and_enqueues_background_task(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    background_tasks = BackgroundTasks()
    payload = schemas.ExtractorRun(mode="entire_document", text="Python, SQL")
    user = SimpleNamespace(id=uuid4())
    db = object()
    created_extractor = SimpleNamespace(id=uuid4(), name="skills")
    captured: dict[str, object] = {}

    async def _missing_extractor(name, db_arg):
        assert name == "skills"
        assert db_arg is db
        raise HTTPException(status_code=404, detail="missing")

    async def _create_extractor(payload_arg, *, db, user):
        captured["payload"] = payload_arg
        captured["db"] = db
        captured["user"] = user
        return created_extractor

    monkeypatch.setattr(skills_route, "get_extractor_by_name", _missing_extractor)
    monkeypatch.setattr(skills_route, "create_extractor", _create_extractor)

    response = await skills_route.extract_user_skills(
        request=_extract_request(),
        background_tasks=background_tasks,
        payload=payload,
        user=user,
        db=db,
    )

    assert response == {"message": "Skills extraction task started"}
    assert len(background_tasks.tasks) == 1
    task = background_tasks.tasks[0]
    assert task.func is skills_route.extract_user_skills_task
    assert task.args == (created_extractor, payload, user, db)

    extractor_payload = captured["payload"]
    assert isinstance(extractor_payload, schemas.ExtractorCreate)
    assert extractor_payload.name == "skills"
    assert extractor_payload.description == "Skill data extractor"
    assert (
        extractor_payload.instruction == "Extract skill JSON data from a given context"
    )
    assert extractor_payload.json_schema == schemas.SkillCreate.model_json_schema()
    assert captured["db"] is db
    assert captured["user"] is user


async def test_extract_user_skills_propagates_non_404_lookup_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    background_tasks = BackgroundTasks()
    payload = schemas.ExtractorRun(mode="entire_document", text="Python")
    expected_error = HTTPException(status_code=503, detail="extractors unavailable")

    async def _failing_lookup(name, db):
        del name, db
        raise expected_error

    monkeypatch.setattr(skills_route, "get_extractor_by_name", _failing_lookup)

    with pytest.raises(HTTPException) as exc_info:
        await skills_route.extract_user_skills(
            request=_extract_request(),
            background_tasks=background_tasks,
            payload=payload,
            user=SimpleNamespace(id=uuid4()),
            db=object(),
        )

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "extractors unavailable"
    assert background_tasks.tasks == []
