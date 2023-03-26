# project/tests/test_leads.py

import json

import pytest

from app.api import leads

def test_create_lead(test_app_with_db, monkeypatch):
    def mock_generate_lead(lead_id, url):
        return None

    monkeypatch.setattr(leads, "generate_lead", mock_generate_lead)
    response = test_app_with_db.post("/leads/", data=json.dumps({"url": "https://foo.bar"}))

    assert response.status_code == 201
    assert response.json()["url"] == "https://foo.bar"
    
def test_create_leads_invalid_json(test_app):
    response = test_app.post("/leads/", data=json.dumps({}))
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


def test_read_lead(test_app_with_db, monkeypatch):
    def mock_generate_lead(lead_id, url):
        return None

    monkeypatch.setattr(leads, "generate_lead", mock_generate_lead)
    response = test_app_with_db.post("/leads/", data=json.dumps({"url": "https://foo.bar"}))

    lead_id = response.json()["id"]

    # Test endpoint with valid lead_id
    response = test_app_with_db.get(f"/leads/{lead_id}")
    
    # Confirm status code and that the lead dict is correct.
    reponse_dict = response.json()
    assert reponse_dict["id"] == lead_id
    assert reponse_dict["url"] == "https://foo.bar"

    response = test_app_with_db.get(f"/leads/{lead_id}")
    assert response.status_code == 200
    

def test_read_lead_incorrect_id(test_app_with_db, monkeypatch):
    def mock_generate_lead(lead_id, url):
        return None

    monkeypatch.setattr(leads, "generate_lead", mock_generate_lead)
    response = test_app_with_db.get("/leads/999/")
    assert response.status_code == 404
    assert response.json()["detail"] == "Lead not found"

    response = test_app_with_db.get("/leads/0/")
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


def test_read_all_leads(test_app_with_db, monkeypatch):
    def mock_generate_lead(lead_id, url):
        return None

    monkeypatch.setattr(leads, "generate_lead", mock_generate_lead)
    response = test_app_with_db.post("/leads/", data=json.dumps({"url": "https://foo.bar"}))
    lead_id = response.json()["id"]

    response = test_app_with_db.get("/leads/")
    assert response.status_code == 200

    response_list = response.json()
    assert len([d for d in response_list if d['id'] == lead_id]) == 1


def test_delete_lead(test_app_with_db, monkeypatch):
    def mock_generate_lead(lead_id, url):
        return None

    monkeypatch.setattr(leads, "generate_lead", mock_generate_lead)
    response = test_app_with_db.post("/leads/", data=json.dumps({"url": "https://foo.bar"}))
    lead_id = response.json()["id"]

    response = test_app_with_db.delete(f"leads/{lead_id}/")

    # Confirm status code and deleted record is returned in response
    assert response.status_code == 200
    assert response.json()["id"] == lead_id
    assert response.json()["url"] == "https://foo.bar"
   

def test_delete_lead_incorrect_id(test_app_with_db):
    response = test_app_with_db.delete("leads/999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Lead not found"


    response = test_app_with_db.delete("/leads/0/")
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

def test_update_lead(test_app_with_db, monkeypatch):
    def mock_generate_lead(lead_id, url):
        return None

    monkeypatch.setattr(leads, "generate_lead", mock_generate_lead)
    response = test_app_with_db.post(
        "/leads/", data=json.dumps({"url": "https://foo.bar"})
    )
    lead_id = response.json()["id"]

    response = test_app_with_db.put(
        f"/leads/{lead_id}/",
        data=json.dumps({"url": "https://foo.bar", "lead": "updated!"})
    )
    assert response.status_code == 200

    response_dict = response.json()
    assert response_dict["id"] == lead_id
    assert response_dict["url"] == "https://foo.bar"
    assert response_dict["lead"] == "updated!"
    assert response_dict["created_at"]


@pytest.mark.parametrize("lead_id, payload, status_code, detail", [
    [999, {"url": "https://foo.bar", "lead": "updated!"}, 404, "Lead not found"],
    [
        0,
        {"url": "https://foo.bar", "lead": "updated!"},
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
        {"url": "https://foo.bar"},
        422,
        [{"loc": ["body", "lead"], "msg": "field required", "type": "value_error.missing"}]
    ],
])
def test_update_lead_invalid(test_app_with_db, lead_id, payload, status_code, detail):
    response = test_app_with_db.put(
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
