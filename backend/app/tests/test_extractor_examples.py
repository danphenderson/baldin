import pytest
from httpx import AsyncClient

from app.conftest import create_user, login_and_get_headers
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")


async def _create_extractor(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    name: str,
) -> dict:
    response = await client.post(
        "/api/v1/extractors/",
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
        f"/api/v1/extractors/{extractor_id}/examples",
        json={"content": content},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.asyncio(loop_scope="module")
async def test_delete_extractor_example_succeeds_for_matching_extractor(
    client: AsyncClient,
    ensure_db: None,
) -> None:
    del ensure_db
    email, _ = await create_user("owner-pass")
    headers = await login_and_get_headers(client, email, "owner-pass")
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
        f"/api/v1/extractors/{extractor['id']}/examples/{example['id']}",
        headers=headers,
    )
    list_response = await client.get(
        f"/api/v1/extractors/{extractor['id']}/examples",
        headers=headers,
    )

    assert delete_response.status_code == 204
    assert list_response.status_code == 200, list_response.text
    assert list_response.json() == []


@pytest.mark.asyncio(loop_scope="module")
async def test_delete_extractor_example_rejects_mismatched_parent_extractor(
    client: AsyncClient,
    ensure_db: None,
) -> None:
    del ensure_db
    email, _ = await create_user("owner-pass")
    headers = await login_and_get_headers(client, email, "owner-pass")
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
        f"/api/v1/extractors/{primary_extractor['id']}/examples/{example['id']}",
        headers=headers,
    )
    list_response = await client.get(
        f"/api/v1/extractors/{secondary_extractor['id']}/examples",
        headers=headers,
    )

    assert delete_response.status_code == 404
    assert list_response.status_code == 200, list_response.text
    assert [item["id"] for item in list_response.json()] == [example["id"]]


@pytest.mark.asyncio(loop_scope="module")
async def test_delete_extractor_example_cannot_delete_other_users_example(
    client: AsyncClient,
    ensure_db: None,
) -> None:
    del ensure_db
    owner_email, _ = await create_user("owner-pass")
    other_email, _ = await create_user("other-pass")
    owner_headers = await login_and_get_headers(client, owner_email, "owner-pass")
    other_headers = await login_and_get_headers(client, other_email, "other-pass")
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
        f"/api/v1/extractors/{other_extractor['id']}/examples/{example['id']}",
        headers=other_headers,
    )
    list_response = await client.get(
        f"/api/v1/extractors/{owner_extractor['id']}/examples",
        headers=owner_headers,
    )

    assert delete_response.status_code == 404
    assert list_response.status_code == 200, list_response.text
    assert [item["id"] for item in list_response.json()] == [example["id"]]
