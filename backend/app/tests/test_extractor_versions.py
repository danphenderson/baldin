"""
Tests for Phase 2 — Extractor Version History & Prompt Hash Traceability.

Covers:
- Initial version creation on extractor create
- New version creation when instruction or schema changes
- No spurious version creation when only name changes
"""

import asyncio

import pytest
from httpx import AsyncClient
from sqlalchemy import inspect, text

from app.conftest import async_client_ctx, create_user, login_and_get_headers
from app.core.db import (
    async_engine,
    drop_and_create_db_and_tables,
)
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")


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


async def test_create_extractor_creates_initial_version(
    client: AsyncClient, ensure_db: None
):
    """Creating an extractor should also create version 1."""
    del ensure_db
    email, _ = await create_user("testpass123")
    headers = await login_and_get_headers(client, email, "testpass123")
    payload = _extractor_payload()
    resp = await client.post("/api/v1/extractors/", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    extractor_id = resp.json()["id"]
    resp = await client.get(
        f"/api/v1/extractors/{extractor_id}/versions", headers=headers
    )
    assert resp.status_code == 200, resp.text
    versions = resp.json()
    assert len(versions) == 1
    assert versions[0]["version_number"] == 1
    assert versions[0]["instruction"] == payload["instruction"]
    assert versions[0]["version_hash"]


async def test_update_extractor_creates_new_version(
    client: AsyncClient, ensure_db: None
):
    """Updating instruction should create a new version."""
    del ensure_db
    email, _ = await create_user("testpass123")
    headers = await login_and_get_headers(client, email, "testpass123")
    payload = _extractor_payload()
    resp = await client.post("/api/v1/extractors/", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    extractor_id = resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/extractors/{extractor_id}",
        json={"instruction": "Extract person names from the text."},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text

    resp = await client.get(
        f"/api/v1/extractors/{extractor_id}/versions", headers=headers
    )
    assert resp.status_code == 200, resp.text
    versions = resp.json()
    assert len(versions) == 2
    assert versions[0]["version_number"] == 2
    assert versions[1]["version_number"] == 1
    assert versions[0]["version_hash"] != versions[1]["version_hash"]


async def test_update_without_schema_change_no_new_version(
    client: AsyncClient, ensure_db: None
):
    """Updating only the name should NOT create a new version."""
    del ensure_db
    email, _ = await create_user("testpass123")
    headers = await login_and_get_headers(client, email, "testpass123")
    payload = _extractor_payload()
    resp = await client.post("/api/v1/extractors/", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    extractor_id = resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/extractors/{extractor_id}",
        json={"name": "Renamed Extractor"},
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


async def test_idempotent_update_with_same_payload_no_new_version(
    client: AsyncClient, ensure_db: None
):
    """Replaying the same payload should not create another version."""
    del ensure_db
    email, _ = await create_user("testpass123")
    headers = await login_and_get_headers(client, email, "testpass123")
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


async def test_update_with_reordered_schema_no_new_version(
    client: AsyncClient, ensure_db: None
):
    """A semantically identical schema should not create another version."""
    del ensure_db
    email, _ = await create_user("testpass123")
    headers = await login_and_get_headers(client, email, "testpass123")
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


async def test_extractor_version_unique_constraint_exists(ensure_db: None):
    del ensure_db
    constraints = await _extractor_version_unique_constraints()

    assert any(
        constraint["name"] == "uq_extractor_versions_extractor_id_version_number"
        and tuple(constraint.get("column_names") or [])
        == ("extractor_id", "version_number")
        for constraint in constraints
    )


async def test_drop_and_create_db_and_tables_restores_extractor_version_constraint(
    ensure_db: None,
):
    del ensure_db

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


async def test_concurrent_instruction_updates_keep_monotonic_versions(
    ensure_db: None,
):
    del ensure_db
    async with async_client_ctx() as client_create:
        email, _ = await create_user("testpass123")
        headers = await login_and_get_headers(client_create, email, "testpass123")

        payload = _extractor_payload()
        resp = await client_create.post(
            "/api/v1/extractors/", json=payload, headers=headers
        )
        assert resp.status_code == 200, resp.text
        extractor_id = resp.json()["id"]

    async with async_client_ctx() as client_one, async_client_ctx() as client_two:
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

    async with async_client_ctx() as client_verify:
        resp = await client_verify.get(
            f"/api/v1/extractors/{extractor_id}/versions",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        versions = resp.json()

    assert [version["version_number"] for version in versions] == [3, 2, 1]
    assert len({version["version_hash"] for version in versions}) == 3
