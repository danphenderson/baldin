from contextlib import asynccontextmanager

import pytest
from httpx import ASGITransport, AsyncClient

from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables
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
        "/auth/register",
        json={"email": email, "password": _valid_password(password)},
    )
    assert response.status_code in {200, 201}, response.text
    return email


async def _auth_headers(
    client: AsyncClient, email: str, password: str
) -> dict[str, str]:
    response = await client.post(
        "/auth/jwt/login",
        data={"username": email, "password": _valid_password(password)},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_extractor(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    name: str,
) -> dict:
    response = await client.post(
        "/extractor/",
        json={
            "name": name,
            "description": "Extractor used by route tests",
            "instruction": "Extract values from the text.",
            "json_schema": {
                "type": "object",
                "title": "Extraction",
                "description": "Extractor example payload",
                "properties": {
                    "value": {
                        "type": "string",
                        "title": "Value",
                        "description": "Extracted value",
                    }
                },
            },
        },
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


async def _create_example(
    client: AsyncClient,
    headers: dict[str, str],
    extractor_id: str,
    *,
    content: str,
) -> dict:
    response = await client.post(
        f"/extractor/{extractor_id}/examples",
        json={"content": content},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.asyncio(loop_scope="module")
async def test_delete_extractor_example_succeeds_for_matching_extractor() -> None:
    async with _client() as client:
        email = await _register_user(client, "owner-pass")
        headers = await _auth_headers(client, email, "owner-pass")
        extractor = await _create_extractor(
            client,
            headers,
            name=f"owned-{utils.random_lower_string(8)}",
        )
        example = await _create_example(
            client,
            headers,
            extractor["id"],
            content="owned example",
        )

        delete_response = await client.delete(
            f"/extractor/{extractor['id']}/examples/{example['id']}",
            headers=headers,
        )
        list_response = await client.get(
            f"/extractor/{extractor['id']}/examples",
            headers=headers,
        )

    assert delete_response.status_code == 204
    assert list_response.status_code == 200, list_response.text
    assert list_response.json() == []


@pytest.mark.asyncio(loop_scope="module")
async def test_delete_extractor_example_rejects_mismatched_parent_extractor() -> None:
    async with _client() as client:
        email = await _register_user(client, "owner-pass")
        headers = await _auth_headers(client, email, "owner-pass")
        primary_extractor = await _create_extractor(
            client,
            headers,
            name=f"primary-{utils.random_lower_string(8)}",
        )
        secondary_extractor = await _create_extractor(
            client,
            headers,
            name=f"secondary-{utils.random_lower_string(8)}",
        )
        example = await _create_example(
            client,
            headers,
            secondary_extractor["id"],
            content="secondary example",
        )

        delete_response = await client.delete(
            f"/extractor/{primary_extractor['id']}/examples/{example['id']}",
            headers=headers,
        )
        list_response = await client.get(
            f"/extractor/{secondary_extractor['id']}/examples",
            headers=headers,
        )

    assert delete_response.status_code == 404
    assert list_response.status_code == 200, list_response.text
    assert [item["id"] for item in list_response.json()] == [example["id"]]


@pytest.mark.asyncio(loop_scope="module")
async def test_delete_extractor_example_cannot_delete_other_users_example() -> None:
    async with _client() as client:
        owner_email = await _register_user(client, "owner-pass")
        other_email = await _register_user(client, "other-pass")
        owner_headers = await _auth_headers(client, owner_email, "owner-pass")
        other_headers = await _auth_headers(client, other_email, "other-pass")
        owner_extractor = await _create_extractor(
            client,
            owner_headers,
            name=f"owner-{utils.random_lower_string(8)}",
        )
        other_extractor = await _create_extractor(
            client,
            other_headers,
            name=f"other-{utils.random_lower_string(8)}",
        )
        example = await _create_example(
            client,
            owner_headers,
            owner_extractor["id"],
            content="private example",
        )

        delete_response = await client.delete(
            f"/extractor/{other_extractor['id']}/examples/{example['id']}",
            headers=other_headers,
        )
        list_response = await client.get(
            f"/extractor/{owner_extractor['id']}/examples",
            headers=owner_headers,
        )

    assert delete_response.status_code == 404
    assert list_response.status_code == 200, list_response.text
    assert [item["id"] for item in list_response.json()] == [example["id"]]
