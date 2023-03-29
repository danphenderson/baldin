# tests/test_leads.py

import json

import pytest

from app.api import leads


@pytest.fixture(scope="module")
def test_client(test_app_with_db):
    test_app_with_db.post("/searches/", data=json.dumps({"keywords": "software engineer", "platform": "linkedin"}))
    yield test_app_with_db


def test_create_lead(test_client):
    response = test_client.post("/leads/", data=json.dumps({"url": "https://linkedin.com/lead", "search_id": 1}))
    assert response.status_code == 201
    resp_dict = response.json()
    assert resp_dict["url"] == "https://linkedin.com/lead"
    assert resp_dict["search_id"] == 1
    assert resp_dict["id"] > 0
    assert resp_dict["created_at"] is not None
    assert resp_dict["updated_at"] is not None

def test_create_leads_invalid_json(test_app):
    response = test_app.post("/leads/", data=json.dumps({"search_id": 1}))
    assert response.status_code == 422
    assert response.json() == {
        "detail": [
            {
                "loc": ["body", "url"],
                "msg": "field required",
                "type": "value_error.missing"
            }
        ]
    }

    response = test_app.post("/leads/", data=json.dumps({"url": "invalid://url"}))
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "URL scheme not permitted"


def test_read_lead(test_client):
    response = test_client.post("/leads/", data=json.dumps({"url": "https://linkedin.com/lead", "search_id": 1}))

    lead_id = response.json()["id"]

    # Test endpoint with valid lead_id
    response = test_client.get(f"/leads/{lead_id}")
    
    # Confirm status code and that the lead dict is correct.
    reponse_dict = response.json()
    assert reponse_dict["id"] == lead_id
    assert reponse_dict["url"] == "https://linkedin.com/lead"

    response = test_client.get(f"/leads/{lead_id}")
    assert response.status_code == 200
    

def test_read_lead_incorrect_id(test_client):
    response = test_client.get("/leads/999/")
    assert response.status_code == 404
    assert response.json()["detail"] == "Lead not found"
    
    response = test_client.get("/leads/0/")
    assert response.status_code == 422
    assert response.json() == {
        "detail": [
            {
                "loc": ["path", "id"],
                "msg": "ensure this value is greater than 0",
                "type": "value_error.number.not_gt",
                "ctx": {"limit_value": 0},
            }
        ]
    }


def test_read_all_leads(test_client):
    response = test_client.post("/leads/", data=json.dumps({"url": "https://linkedin.com/lead", "search_id": 1}))
    lead_id = response.json()["id"]

    response = test_client.get("/leads/")
    assert response.status_code == 200

    response_list = response.json()
    assert len([d for d in response_list if d['id'] == lead_id]) == 1


def test_delete_lead(test_client):
    response = test_client.post("/leads/", data=json.dumps({"url": "https://linkedin.com/lead", "search_id": 1}))
    lead_id = response.json()["id"]

    response = test_client.delete(f"leads/{lead_id}/")

    # Confirm status code and deleted record is returned in response
    assert response.status_code == 200
    assert response.json()["id"] == lead_id
    assert response.json()["url"] == "https://linkedin.com/lead"
   

def test_delete_lead_incorrect_id(test_client):
    response = test_client.delete("leads/999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Lead not found"


    response = test_client.delete("/leads/0/")
    assert response.status_code == 422
    assert response.json() == {
        "detail": [
            {
                "loc": ["path", "id"],
                "msg": "ensure this value is greater than 0",
                "type": "value_error.number.not_gt",
                "ctx": {"limit_value": 0},
            }
        ]
    }

def test_update_lead(test_client):
    response = test_client.post(
        "/leads/", data=json.dumps({"url": "https://linkedin.com/lead", "search_id": 1})
    )
    lead_id = response.json()["id"]

    response = test_client.put(
        f"/leads/{lead_id}/",
        data=json.dumps({"url": "https://linkedin.com/lead", "lead": "updated!"})
    )
    assert response.status_code == 200

    response_dict = response.json()
    assert response_dict["id"] == lead_id
    assert response_dict["url"] == "https://linkedin.com/lead"
    assert response_dict["lead"] == "updated!"
    assert response_dict["created_at"]


@pytest.mark.parametrize("lead_id, payload, status_code, detail", [
    [999, {"url": "https://linkedin.com/lead", "lead": "updated!"}, 404, "Lead not found"],
    [
        0,
        {"url": "https://linkedin.com/lead", "lead": "updated!"},
        422,
        [{"loc": ["path", "id"], "msg": "ensure this value is greater than 0", "type": "value_error.number.not_gt", "ctx": {"limit_value": 0}}]
    ],
    [
        1,
        {},
        422,
        [
            {"loc": ["body", "url"], "msg": "field required", "type": "value_error.missing"},
            {"loc": ["body", "lead"], "msg": "field required", "type": "value_error.missing"}
        ]
    ],
    [
        1,
        {"url": "https://linkedin.com/lead"},
        422,
        [{"loc": ["body", "lead"], "msg": "field required", "type": "value_error.missing"}]
    ],
])
def test_update_lead_invalid(test_client, lead_id, payload, status_code, detail):
    response = test_client.put(
        f"/leads/{lead_id}/",
        data=json.dumps(payload)
    )
    assert response.status_code == status_code
    assert response.json()["detail"] == detail


def test_update_lead_invalid_url(test_app):
    response = test_app.put(
        "/leads/1/",
        data=json.dumps({"url": "invalid://url", "lead": "updated!"})
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "URL scheme not permitted"
