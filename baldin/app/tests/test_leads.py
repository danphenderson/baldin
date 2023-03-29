# tests/test_lead.py
import pytest

from app.main import app
from app.models.tortoise import Lead

@pytest.fixture(scope="module")
def lead_payload(test_client):
    return {
        'url': 'https://linkedin.com/lead',
        'title': 'Example Lead',
        'company': 'Example Company',
        'description': 'This is an example lead',
        'location': 'Example City',
        'salary': 'Example Salary',
        'job_function': 'Example Job Function',
        'industries': 'Example Industries',
        'employment_type': 'Example Employment Type'
    }

def test_create_lead(test_client, lead_payload):
    response = test_client.post("/leads/", json=lead_payload)
    assert response.status_code == 200
    assert response.json()["id"] is not None
    assert response.json()["url"] == lead_payload.url
    assert response.json()["title"] == lead_payload.title
    assert response.json()["company"] == lead_payload.company
    assert response.json()["description"] == lead_payload.description
    assert response.json()["location"] == lead_payload.location
    assert response.json()["salary"] == lead_payload.salary
    assert response.json()["job_function"] == lead_payload.job_function
    assert response.json()["industries"] == lead_payload.industries
    assert response.json()["employment_type"] == lead_payload.employment_type