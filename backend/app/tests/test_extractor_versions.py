"""
Tests for Phase 2 — Extractor Version History & Prompt Hash Traceability.

Covers:
- Initial version creation on extractor create
- New version creation when instruction or schema changes
- No spurious version creation when only name changes
"""

import asyncio
from contextlib import asynccontextmanager
from uuid import UUID

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import inspect, text

from app.core import conf
from app.core.db import (
    async_engine,
    drop_and_create_db_and_tables,
    session_context,
)
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@asynccontextmanager
async def _client():
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


async def _ensure_db_ready():
    global _db_ready
    if _db_ready:
        return
    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    app.state.bootstrap_completed = True
    _db_ready = True


async def _create_user(
    password: str, *, is_superuser: bool = False
) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=is_superuser,
        )
        await session.commit()
    return email, user.id


async def _auth_headers(
    client: AsyncClient, email: str, password: str
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _extractor_payload(**overrides) -> dict:
    payload = {
        "name": f"Test Extractor {utils.random_lower_string(6)}",
        "description": "Test extractor description",
        "instruction": "Extract company names from the text.",
        "json_schema": {
            "type": "object",
            "title": "Companies",
            "description": "Extracted companies",
            "properties": {
                "companies": {
                    "type": "array",
                    "items": {"type": "string"},
                    "title": "Companies",
                    "description": "List of company names",
                }
            },
        },
    }
    payload.update(overrides)
    return payload


async def _extractor_version_unique_constraints() -> list[dict]:
    async with async_engine.connect() as conn:
        return await conn.run_sync(
            lambda sync_conn: inspect(sync_conn).get_unique_constraints(
                "extractor_versions",
                schema="public",
            )
        )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_create_extractor_creates_initial_version():
    """Creating an extractor should also create version 1."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("testpass123", is_superuser=False)
        headers = await _auth_headers(client, email, "testpass123")

        # Create extractor
        payload = _extractor_payload()
        resp = await client.post("/api/v1/extractors/", json=payload, headers=headers)
        assert resp.status_code == 200, resp.text
        extractor_id = resp.json()["id"]

        # List versions
        resp = await client.get(
            f"/api/v1/extractors/{extractor_id}/versions", headers=headers
        )
        assert resp.status_code == 200, resp.text
        versions = resp.json()
        assert len(versions) == 1
        assert versions[0]["version_number"] == 1
        assert versions[0]["instruction"] == payload["instruction"]
        assert versions[0]["version_hash"]  # non-empty hash


async def test_update_extractor_creates_new_version():
    """Updating instruction should create a new version."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("testpass123", is_superuser=False)
        headers = await _auth_headers(client, email, "testpass123")

        # Create extractor
        payload = _extractor_payload()
        resp = await client.post("/api/v1/extractors/", json=payload, headers=headers)
        assert resp.status_code == 200, resp.text
        extractor_id = resp.json()["id"]

        # Update instruction
        resp = await client.patch(
            f"/api/v1/extractors/{extractor_id}",
            json={"instruction": "Extract person names from the text."},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text

        # List versions
        resp = await client.get(
            f"/api/v1/extractors/{extractor_id}/versions", headers=headers
        )
        assert resp.status_code == 200, resp.text
        versions = resp.json()
        assert len(versions) == 2
        # Newest first
        assert versions[0]["version_number"] == 2
        assert versions[1]["version_number"] == 1
        # Hashes should differ
        assert versions[0]["version_hash"] != versions[1]["version_hash"]


async def test_update_without_schema_change_no_new_version():
    """Updating only the name should NOT create a new version."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("testpass123", is_superuser=False)
        headers = await _auth_headers(client, email, "testpass123")

        # Create extractor
        payload = _extractor_payload()
        resp = await client.post("/api/v1/extractors/", json=payload, headers=headers)
        assert resp.status_code == 200, resp.text
        extractor_id = resp.json()["id"]

        # Update name only
        resp = await client.patch(
            f"/api/v1/extractors/{extractor_id}",
            json={"name": "Renamed Extractor"},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text

        # List versions — should still be 1
        resp = await client.get(
            f"/api/v1/extractors/{extractor_id}/versions", headers=headers
        )
        assert resp.status_code == 200, resp.text
        versions = resp.json()
        assert len(versions) == 1
        assert versions[0]["version_number"] == 1


async def test_idempotent_update_with_same_payload_no_new_version():
    """Replaying the same payload should not create another version."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("testpass123", is_superuser=False)
        headers = await _auth_headers(client, email, "testpass123")

        payload = _extractor_payload()
        resp = await client.post("/api/v1/extractors/", json=payload, headers=headers)
        assert resp.status_code == 200, resp.text
        extractor_id = resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/extractors/{extractor_id}",
            json=payload,
            headers=headers,
        )
        assert resp.status_code == 200, resp.text

        resp = await client.get(
            f"/api/v1/extractors/{extractor_id}/versions", headers=headers
        )
        assert resp.status_code == 200, resp.text
        versions = resp.json()
        assert len(versions) == 1
        assert versions[0]["version_number"] == 1


async def test_update_with_reordered_schema_no_new_version():
    """A semantically identical schema should not create another version."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("testpass123", is_superuser=False)
        headers = await _auth_headers(client, email, "testpass123")

        payload = _extractor_payload()
        resp = await client.post("/api/v1/extractors/", json=payload, headers=headers)
        assert resp.status_code == 200, resp.text
        extractor_id = resp.json()["id"]

        reordered_schema = {
            "description": payload["json_schema"]["description"],
            "properties": {
                "companies": {
                    "description": payload["json_schema"]["properties"]["companies"][
                        "description"
                    ],
                    "items": payload["json_schema"]["properties"]["companies"]["items"],
                    "title": payload["json_schema"]["properties"]["companies"]["title"],
                    "type": payload["json_schema"]["properties"]["companies"]["type"],
                }
            },
            "title": payload["json_schema"]["title"],
            "type": payload["json_schema"]["type"],
        }

        resp = await client.patch(
            f"/api/v1/extractors/{extractor_id}",
            json={"json_schema": reordered_schema},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text

        resp = await client.get(
            f"/api/v1/extractors/{extractor_id}/versions", headers=headers
        )
        assert resp.status_code == 200, resp.text
        versions = resp.json()
        assert len(versions) == 1
        assert versions[0]["version_number"] == 1


async def test_extractor_version_unique_constraint_exists():
    await _ensure_db_ready()

    constraints = await _extractor_version_unique_constraints()

    assert any(
        constraint["name"] == "uq_extractor_versions_extractor_id_version_number"
        and tuple(constraint.get("column_names") or [])
        == ("extractor_id", "version_number")
        for constraint in constraints
    )


async def test_drop_and_create_db_and_tables_restores_extractor_version_constraint():
    await _ensure_db_ready()

    async with async_engine.begin() as conn:
        await conn.execute(
            text(
                "ALTER TABLE extractor_versions "
                "DROP CONSTRAINT IF EXISTS "
                "uq_extractor_versions_extractor_id_version_number"
            )
        )

    constraints = await _extractor_version_unique_constraints()
    assert not any(
        constraint["name"] == "uq_extractor_versions_extractor_id_version_number"
        for constraint in constraints
    )

    await async_engine.dispose()
    await drop_and_create_db_and_tables()

    constraints = await _extractor_version_unique_constraints()
    assert any(
        constraint["name"] == "uq_extractor_versions_extractor_id_version_number"
        and tuple(constraint.get("column_names") or [])
        == ("extractor_id", "version_number")
        for constraint in constraints
    )


async def test_concurrent_instruction_updates_keep_monotonic_versions():
    await _ensure_db_ready()
    async with _client() as client_create:
        email, _ = await _create_user("testpass123", is_superuser=False)
        headers = await _auth_headers(client_create, email, "testpass123")

        payload = _extractor_payload()
        resp = await client_create.post(
            "/api/v1/extractors/", json=payload, headers=headers
        )
        assert resp.status_code == 200, resp.text
        extractor_id = resp.json()["id"]

    async with _client() as client_one, _client() as client_two:
        responses = await asyncio.gather(
            client_one.patch(
                f"/api/v1/extractors/{extractor_id}",
                json={"instruction": "Extract executive names from the text."},
                headers=headers,
            ),
            client_two.patch(
                f"/api/v1/extractors/{extractor_id}",
                json={"instruction": "Extract customer names from the text."},
                headers=headers,
            ),
        )

    for response in responses:
        assert response.status_code == 200, response.text

    async with _client() as client_verify:
        resp = await client_verify.get(
            f"/api/v1/extractors/{extractor_id}/versions",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        versions = resp.json()

    assert [version["version_number"] for version in versions] == [3, 2, 1]
    assert len({version["version_hash"] for version in versions}) == 3
