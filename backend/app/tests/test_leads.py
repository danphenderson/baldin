# Path: app/tests/test_leads.py

import pytest


@pytest.fixture(scope="module")
def lead_payload() -> dict:
    return {
        "url": "https://www.linkedin.com/jobs/view/123456789",
        "title": "Software Engineer",
        "company": "Google",
        "description": "Write code",
        "location": "Mountain View, CA",
        "salary": "100000",
        "job_function": "Software Engineer",
        "industries": "Technology",
        "employment_type": "Full-time",
    }


@pytest.fixture(scope="module")
def lead_payload_missing_url() -> dict:
    return {
        "title": "Software Engineer",
        "company": "Google",
        "description": "Write code",
        "location": "Mountain View, CA",
        "salary": "100000",
        "job_function": "Software Engineer",
        "industries": "Technology",
        "employment_type": "Full-time",
    }


@pytest.fixture(scope="module")
def lead_response(lead_payload) -> dict:
    return {
        "url": lead_payload["url"],
        "title": lead_payload["title"],
        "company": lead_payload["company"],
        "description": lead_payload["description"],
        "location": lead_payload["location"],
        "salary": lead_payload["salary"],
        "job_function": lead_payload["job_function"],
        "industries": lead_payload["industries"],
        "employment_type": lead_payload["employment_type"],
    }


@pytest.fixture(scope="module")
async def posted_lead(test_client, lead_payload):
    async for client in test_client:  # Handle async generator correctly
        response = await client.post("/leads/", json=lead_payload)
        return response


@pytest.mark.xfail
@pytest.mark.asyncio
async def test_create_lead(lead_payload, posted_lead):
    posted_lead = await posted_lead
    assert posted_lead.status_code == 201
    if not posted_lead.json():
        assert False
    for key, _ in lead_payload.items():
        assert lead_payload[key] == posted_lead.json()[key]


@pytest.mark.asyncio
async def test_create_lead_missing_url(lead_payload_missing_url, test_client):
    async for client in test_client:  # Correctly handle async generator
        response = await client.post("/leads/", json=lead_payload_missing_url)
        assert response.status_code == 422
        assert response.json() == {
            "detail": [
                {
                    "loc": ["body", "url"],
                    "msg": "field required",
                    "type": "value_error.missing",
                }
            ]
        }


@pytest.mark.asyncio
async def test_get_lead(posted_lead, lead_payload, test_client):
    async for client in test_client:  # Correctly handle async generator
        posted_lead_data = await posted_lead
        response = await client.get(f"/leads/{posted_lead_data.json()['id']}")
        assert response.status_code == 200
        for key, _ in lead_payload.items():
            assert lead_payload[key] == response.json()[key]
