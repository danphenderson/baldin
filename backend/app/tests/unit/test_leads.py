# tests/test_leads.py

import pytest
from fastapi import Response

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
        "employment_type": "Full-time"
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
        "employment_type": "Full-time"
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
        "employment_type": lead_payload["employment_type"]
    }


@pytest.fixture(scope="module")
def posted_lead(test_client, lead_payload) -> Response:
    return test_client.post("/leads/", json=lead_payload)


def test_create_lead(lead_payload, posted_lead):
    assert posted_lead.status_code == 201
    if not posted_lead.json():
        assert False
    for key, _ in lead_payload.items():
        assert lead_payload[key] == posted_lead.json()[key]


def test_create_lead_missing_url(lead_payload_missing_url, test_client):
    response = test_client.post("/leads/", json=lead_payload_missing_url)
    assert response.status_code == 422
    assert response.json() == {
      "detail": [
        {
          "loc": [
            "body",
            "url"
          ],
          "msg": "field required",
          "type": "value_error.missing"
        }
      ]
    }

def test_get_lead(posted_lead, lead_payload, test_client):
    lead_id = posted_lead.json()["id"]
    response = test_client.get(f"/leads/{lead_id}")
    assert response.status_code == 200
    for key, _ in lead_payload.items():
        assert lead_payload[key] == posted_lead.json()[key]


@pytest.mark.xfail
def test_get_latest_lead(lead_payload, posted_lead, test_client):
    response = test_client.get("/leads/latest")
    assert response.status_code == 200
    for key, _ in lead_payload.items():
        assert lead_payload[key] == posted_lead.json()[key]