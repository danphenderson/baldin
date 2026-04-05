import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app import schemas
from app.api.routes import users as user_routes


class _FakeDB:
    def __init__(self) -> None:
        self.user = SimpleNamespace(
            id=uuid4(),
            first_name=None,
            last_name=None,
            phone_number=None,
            address_line_1=None,
            address_line_2=None,
            city=None,
            state=None,
            zip_code=None,
            country=None,
            time_zone=None,
        )

    async def get(self, model, id):
        return self.user

    async def commit(self) -> None:
        return None

    async def refresh(self, obj) -> None:
        return None


class _SharedSessionGuard:
    def __init__(self) -> None:
        self.active = 0
        self.max_active = 0

    @asynccontextmanager
    async def section(self):
        self.active += 1
        self.max_active = max(self.max_active, self.active)
        try:
            await asyncio.sleep(0)
            if self.active > 1:
                raise AssertionError("shared session work ran concurrently")
            yield
        finally:
            self.active -= 1


def _build_extractor(name: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        name=name,
        description="Test extractor",
        instruction="Extract profile data",
        json_schema={},
        extractor_examples=[],
    )


@pytest.mark.asyncio
async def test_extract_user_profile_serializes_shared_session_work(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _FakeDB()
    user = SimpleNamespace(id=db.user.id)
    guard = _SharedSessionGuard()

    async def fake_get_or_create_extractor(name, db, user):
        async with guard.section():
            return _build_extractor(name)

    async def fake_run_extractor(extractor, payload, user, db):
        async with guard.section():
            if extractor.name == "user_profile":
                return schemas.ExtractorResponse(
                    data=[{"first_name": "Dana", "last_name": "Henderson"}],
                    content_too_long=False,
                )
            if extractor.name == "skills":
                return schemas.ExtractorResponse(
                    data=[
                        {"name": "Python", "category": "Programming"},
                        {"name": "SQL", "category": "Data"},
                    ],
                    content_too_long=False,
                )
            return schemas.ExtractorResponse(data=[], content_too_long=False)

    async def fake_create_skill(payload, db, user):
        async with guard.section():
            now = datetime.utcnow()
            return schemas.SkillRead(
                id=uuid4(),
                created_at=now,
                updated_at=now,
                name=payload.name,
                category=payload.category,
            )

    monkeypatch.setattr(
        user_routes,
        "_get_or_create_extractor",
        fake_get_or_create_extractor,
    )
    monkeypatch.setattr(user_routes, "run_extractor", fake_run_extractor)
    monkeypatch.setattr(user_routes, "create_skill", fake_create_skill)

    response = await user_routes.extract_user_profile(
        payload=schemas.ExtractorRun(
            mode="entire_document",
            text="Dana Henderson\nSkills: Python\nSkills: SQL",
        ),
        user=user,
        db=db,
    )

    assert response.user == {"first_name": "Dana", "last_name": "Henderson"}
    assert [skill.name for skill in response.skills] == ["Python", "SQL"]
    assert db.user.first_name == "Dana"
    assert db.user.last_name == "Henderson"
    assert guard.max_active == 1
