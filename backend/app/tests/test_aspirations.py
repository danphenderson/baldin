import asyncio
from contextlib import asynccontextmanager
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app import models, schemas
from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.core.rag.match_aspirations import suggest as suggest_service
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")


def _valid_password(seed: str) -> str:
    normalized = "".join(ch for ch in seed if ch.isalnum()) or "testuser"
    return f"{normalized}Aa1!"


@asynccontextmanager
async def _client() -> AsyncClient:
    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


async def _register_user(client: AsyncClient, password: str) -> str:
    email = utils.random_email()
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": _valid_password(password)},
    )
    assert response.status_code in {200, 201}
    return email


async def _auth_headers(
    client: AsyncClient,
    email: str,
    password: str,
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": _valid_password(password)},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _lookup_user_id(email: str):
    async with session_context() as session:
        result = await session.execute(
            select(models.User).where(models.User.email == email)
        )
        return result.scalar_one().id


async def _seed_profile(
    user_id,
    *,
    include_skill: bool = True,
) -> None:
    async with session_context() as session:
        if include_skill:
            session.add(
                models.Skill(
                    user_id=user_id,
                    name="Python",
                    category="backend",
                    yoe=5,
                    subskills=["FastAPI", "Postgres"],
                )
            )
        session.add(
            models.Experience(
                user_id=user_id,
                title="Platform Engineer",
                company="Baldin",
                description="Built internal workflow tooling and backend systems.",
                projects=["Developer platform"],
            )
        )
        session.add(
            models.Education(
                user_id=user_id,
                degree="BS Computer Science",
                university="Example University",
                achievements=["Capstone on distributed systems"],
            )
        )
        session.add(
            models.Certificate(
                user_id=user_id,
                title="AWS Solutions Architect",
                issuer="Amazon",
            )
        )
        await session.commit()


async def _create_aspiration(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    kind: str = "role",
    label: str = "Staff Engineer",
    reason: str | None = "Career growth",
    notes: str | None = "Remote-first",
    priority: int = 0,
    extracted_attributes: dict | None = None,
):
    response = await client.post(
        "/api/v1/aspirations",
        json={
            "kind": kind,
            "label": label,
            "reason": reason,
            "notes": notes,
            "priority": priority,
            "extracted_attributes": extracted_attributes,
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_create_aspiration_round_trip() -> None:
    async with _client() as client:
        email = await _register_user(client, "aspiration-create-pass")
        headers = await _auth_headers(client, email, "aspiration-create-pass")

        response = await client.post(
            "/api/v1/aspirations",
            json={
                "kind": "role",
                "label": "  Staff Engineer  ",
                "reason": "  Growth path  ",
                "notes": "   ",
                "priority": 2,
                "extracted_attributes": {"seniority": "staff"},
            },
            headers=headers,
        )

    assert response.status_code == 201
    body = response.json()
    assert body["kind"] == "role"
    assert body["label"] == "Staff Engineer"
    assert body["reason"] == "Growth path"
    assert body["notes"] is None
    assert body["priority"] == 2
    assert body["extracted_attributes"] == {"seniority": "staff"}


async def test_list_aspirations_only_returns_current_users_records() -> None:
    async with _client() as client:
        owner_email = await _register_user(client, "aspiration-owner-pass")
        other_email = await _register_user(client, "aspiration-other-pass")
        owner_headers = await _auth_headers(
            client, owner_email, "aspiration-owner-pass"
        )
        other_headers = await _auth_headers(
            client, other_email, "aspiration-other-pass"
        )

        owner_aspiration = await _create_aspiration(
            client,
            owner_headers,
            kind="role",
            label="Platform Engineer",
        )
        await _create_aspiration(
            client,
            other_headers,
            kind="role",
            label="Other User Role",
        )

        response = await client.get("/api/v1/aspirations", headers=owner_headers)

    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == [owner_aspiration["id"]]


async def test_list_aspirations_filters_by_kind() -> None:
    async with _client() as client:
        email = await _register_user(client, "aspiration-filter-pass")
        headers = await _auth_headers(client, email, "aspiration-filter-pass")

        await _create_aspiration(client, headers, kind="role", label="Backend Lead")
        company = await _create_aspiration(
            client,
            headers,
            kind="company",
            label="Acme Corp",
        )

        response = await client.get(
            "/api/v1/aspirations",
            params={"kind": "company"},
            headers=headers,
        )

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == company["id"]
    assert items[0]["kind"] == "company"


async def test_list_aspirations_orders_newest_first() -> None:
    async with _client() as client:
        email = await _register_user(client, "aspiration-order-pass")
        headers = await _auth_headers(client, email, "aspiration-order-pass")

        await _create_aspiration(client, headers, label="First Aspiration")
        await asyncio.sleep(0.01)
        await _create_aspiration(client, headers, label="Second Aspiration")

        response = await client.get("/api/v1/aspirations", headers=headers)

    assert response.status_code == 200
    labels = [item["label"] for item in response.json()["items"]]
    assert labels == ["Second Aspiration", "First Aspiration"]


async def test_get_aspiration_by_id() -> None:
    async with _client() as client:
        email = await _register_user(client, "aspiration-get-pass")
        headers = await _auth_headers(client, email, "aspiration-get-pass")
        aspiration = await _create_aspiration(
            client,
            headers,
            label="Director of Engineering",
            extracted_attributes={"team_size": "large"},
        )

        response = await client.get(
            f"/api/v1/aspirations/{aspiration['id']}",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == aspiration["id"]
    assert body["extracted_attributes"] == {"team_size": "large"}


async def test_get_aspiration_unknown_id_returns_404() -> None:
    async with _client() as client:
        email = await _register_user(client, "aspiration-missing-pass")
        headers = await _auth_headers(client, email, "aspiration-missing-pass")

        response = await client.get(
            f"/api/v1/aspirations/{uuid4()}",
            headers=headers,
        )

    assert response.status_code == 404


async def test_update_aspiration() -> None:
    async with _client() as client:
        email = await _register_user(client, "aspiration-update-pass")
        headers = await _auth_headers(client, email, "aspiration-update-pass")
        aspiration = await _create_aspiration(
            client,
            headers,
            label="Engineering Manager",
            notes="Original note",
        )

        response = await client.patch(
            f"/api/v1/aspirations/{aspiration['id']}",
            json={
                "kind": "company",
                "label": "Acme Corp",
                "reason": "  Strong product culture  ",
                "notes": "   ",
                "priority": 3,
                "extracted_attributes": {"industry": "saas"},
            },
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["kind"] == "company"
    assert body["label"] == "Acme Corp"
    assert body["reason"] == "Strong product culture"
    assert body["notes"] is None
    assert body["priority"] == 3
    assert body["extracted_attributes"] == {"industry": "saas"}


async def test_delete_aspiration() -> None:
    async with _client() as client:
        email = await _register_user(client, "aspiration-delete-pass")
        headers = await _auth_headers(client, email, "aspiration-delete-pass")
        aspiration = await _create_aspiration(
            client,
            headers,
            label="Delete Me",
        )

        delete_response = await client.delete(
            f"/api/v1/aspirations/{aspiration['id']}",
            headers=headers,
        )
        get_response = await client.get(
            f"/api/v1/aspirations/{aspiration['id']}",
            headers=headers,
        )

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


async def test_aspiration_routes_reject_cross_user_access() -> None:
    async with _client() as client:
        owner_email = await _register_user(client, "aspiration-cross-owner-pass")
        viewer_email = await _register_user(client, "aspiration-cross-viewer-pass")
        owner_headers = await _auth_headers(
            client, owner_email, "aspiration-cross-owner-pass"
        )
        viewer_headers = await _auth_headers(
            client, viewer_email, "aspiration-cross-viewer-pass"
        )
        aspiration = await _create_aspiration(
            client,
            owner_headers,
            label="Private Aspiration",
        )

        get_response = await client.get(
            f"/api/v1/aspirations/{aspiration['id']}",
            headers=viewer_headers,
        )
        patch_response = await client.patch(
            f"/api/v1/aspirations/{aspiration['id']}",
            json={"label": "Hijacked"},
            headers=viewer_headers,
        )
        delete_response = await client.delete(
            f"/api/v1/aspirations/{aspiration['id']}",
            headers=viewer_headers,
        )

    assert get_response.status_code == 403
    assert patch_response.status_code == 403
    assert delete_response.status_code == 403


async def test_duplicate_aspiration_same_user_kind_returns_409() -> None:
    async with _client() as client:
        email = await _register_user(client, "aspiration-duplicate-pass")
        headers = await _auth_headers(client, email, "aspiration-duplicate-pass")

        first_response = await client.post(
            "/api/v1/aspirations",
            json={"kind": "role", "label": "Staff Engineer"},
            headers=headers,
        )
        second_response = await client.post(
            "/api/v1/aspirations",
            json={"kind": "role", "label": "  Staff Engineer  "},
            headers=headers,
        )

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert "already exists" in second_response.json()["detail"].lower()


async def test_duplicate_aspiration_update_returns_409() -> None:
    async with _client() as client:
        email = await _register_user(client, "aspiration-duplicate-update-pass")
        headers = await _auth_headers(client, email, "aspiration-duplicate-update-pass")
        first = await _create_aspiration(
            client,
            headers,
            kind="role",
            label="Platform Engineer",
        )
        second = await _create_aspiration(
            client,
            headers,
            kind="role",
            label="Staff Engineer",
        )

        response = await client.patch(
            f"/api/v1/aspirations/{second['id']}",
            json={"label": first["label"]},
            headers=headers,
        )

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()


async def test_same_label_allowed_for_different_users_and_kinds() -> None:
    async with _client() as client:
        first_email = await _register_user(client, "aspiration-scope-first-pass")
        second_email = await _register_user(client, "aspiration-scope-second-pass")
        first_headers = await _auth_headers(
            client, first_email, "aspiration-scope-first-pass"
        )
        second_headers = await _auth_headers(
            client, second_email, "aspiration-scope-second-pass"
        )

        first_response = await client.post(
            "/api/v1/aspirations",
            json={"kind": "role", "label": "Staff Engineer"},
            headers=first_headers,
        )
        second_user_response = await client.post(
            "/api/v1/aspirations",
            json={"kind": "role", "label": "Staff Engineer"},
            headers=second_headers,
        )
        second_kind_response = await client.post(
            "/api/v1/aspirations",
            json={"kind": "company", "label": "Staff Engineer"},
            headers=first_headers,
        )

    assert first_response.status_code == 201
    assert second_user_response.status_code == 201
    assert second_kind_response.status_code == 201


@pytest.fixture(autouse=True)
def _configure_openai(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(conf.openai, "API_KEY", "test-openai-key")


async def test_suggest_aspirations_returns_draft_suggestions_for_populated_profile(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        return schemas.AspirationSuggestResponse(
            suggestions=[
                schemas.AspirationSuggestionDraft(
                    kind=schemas.AspirationKind.ROLE,
                    label="Staff Backend Engineer",
                    reason="Strong backend and platform signal",
                    notes="Good next step",
                ),
                schemas.AspirationSuggestionDraft(
                    kind=schemas.AspirationKind.COMPANY,
                    label="Developer tools company",
                    reason="Profile points to internal tooling work",
                    notes="Prefer infrastructure-heavy teams",
                ),
            ]
        )

    monkeypatch.setattr(
        suggest_service,
        "ainvoke_structured_prompt",
        _fake_generator,
    )

    async with _client() as client:
        email = await _register_user(client, "aspiration-suggest-pass")
        user_id = await _lookup_user_id(email)
        await _seed_profile(user_id)
        headers = await _auth_headers(client, email, "aspiration-suggest-pass")

        response = await client.post("/api/v1/aspirations/suggest", headers=headers)

    assert response.status_code == 200, response.text
    body = response.json()
    assert [item["kind"] for item in body["suggestions"]] == ["role", "company"]
    assert all(item["priority"] == 0 for item in body["suggestions"])


async def test_suggest_aspirations_excludes_saved_aspirations_by_normalized_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        return schemas.AspirationSuggestResponse(
            suggestions=[
                schemas.AspirationSuggestionDraft(
                    kind=schemas.AspirationKind.ROLE,
                    label="  Staff Engineer  ",
                    reason="Should be excluded",
                    notes="Already saved",
                ),
                schemas.AspirationSuggestionDraft(
                    kind=schemas.AspirationKind.COMPANY,
                    label="Platform infrastructure company",
                    reason="Still allowed",
                    notes=None,
                ),
            ]
        )

    monkeypatch.setattr(
        suggest_service,
        "ainvoke_structured_prompt",
        _fake_generator,
    )

    async with _client() as client:
        email = await _register_user(client, "aspiration-suggest-existing-pass")
        user_id = await _lookup_user_id(email)
        await _seed_profile(user_id)
        headers = await _auth_headers(client, email, "aspiration-suggest-existing-pass")
        await _create_aspiration(client, headers, kind="role", label="Staff Engineer")

        response = await client.post("/api/v1/aspirations/suggest", headers=headers)

    assert response.status_code == 200, response.text
    suggestions = response.json()["suggestions"]
    assert len(suggestions) == 1
    assert suggestions[0]["kind"] == "company"
    assert suggestions[0]["label"] == "Platform infrastructure company"


async def test_suggest_aspirations_normalizes_optional_fields_like_crud(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        return schemas.AspirationSuggestResponse(
            suggestions=[
                schemas.AspirationSuggestionDraft.model_construct(
                    kind=schemas.AspirationKind.ROLE,
                    label="  Senior Platform Engineer  ",
                    reason="  Build on platform background  ",
                    notes="   ",
                    priority=9,
                    extracted_attributes={"focus": "platform"},
                )
            ]
        )

    monkeypatch.setattr(
        suggest_service,
        "ainvoke_structured_prompt",
        _fake_generator,
    )

    async with _client() as client:
        email = await _register_user(client, "aspiration-suggest-normalize-pass")
        user_id = await _lookup_user_id(email)
        await _seed_profile(user_id)
        headers = await _auth_headers(
            client, email, "aspiration-suggest-normalize-pass"
        )

        response = await client.post("/api/v1/aspirations/suggest", headers=headers)

    assert response.status_code == 200, response.text
    suggestion = response.json()["suggestions"][0]
    assert suggestion["label"] == "Senior Platform Engineer"
    assert suggestion["reason"] == "Build on platform background"
    assert suggestion["notes"] is None
    assert suggestion["priority"] == 0
    assert suggestion["extracted_attributes"] == {"focus": "platform"}


async def test_suggest_aspirations_returns_400_when_profile_has_no_usable_signal(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _should_not_run(*args, **kwargs):
        raise AssertionError(
            "Suggestion generator should not run without profile signal"
        )

    monkeypatch.setattr(
        suggest_service,
        "ainvoke_structured_prompt",
        _should_not_run,
    )

    async with _client() as client:
        email = await _register_user(client, "aspiration-suggest-empty-pass")
        headers = await _auth_headers(client, email, "aspiration-suggest-empty-pass")

        response = await client.post("/api/v1/aspirations/suggest", headers=headers)

    assert response.status_code == 400, response.text
    assert "does not contain enough information" in response.json()["detail"]
