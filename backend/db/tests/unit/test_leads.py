# project/tests/unit/test_leads.py


import json
from datetime import datetime

import pytest

from app.api import crud, leads


def test_create_lead(test_app, monkeypatch):
    pass


def test_create_leads_invalid_json(test_app):
    response = test_app.post("/leads/", data=json.dumps({}))
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

    response = test_app.post("/leads/", data=json.dumps({"url": "invalid://url"}))
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "URL scheme not permitted"


def test_read_lead(test_app, monkeypatch):
    pass


def test_read_lead_incorrect_id(test_app, monkeypatch):
    pass


def test_read_all_leads(test_app, monkeypatch):
    pass


def test_remove_lead(test_app, monkeypatch):
    pass


def test_remove_lead_incorrect_id(test_app, monkeypatch):
    pass


def test_update_lead(test_app, monkeypatch):
    pass


@pytest.mark.parametrize(
    "lead_id, payload, status_code, detail",
    [
        [
            999,
            {"url": "https://foo.bar", "lead": "updated!"},
            404,
            "Lead not found",
        ],
        [
            0,
            {"url": "https://foo.bar", "lead": "updated!"},
            422,
            [
                {
                    "loc": ["path", "id"],
                    "msg": "ensure this value is greater than 0",
                    "type": "value_error.number.not_gt",
                    "ctx": {"limit_value": 0},
                }
            ],
        ],
        [
            1,
            {},
            422,
            [
                {
                    "loc": ["body", "url"],
                    "msg": "field required",
                    "type": "value_error.missing",
                },
                {
                    "loc": ["body", "lead"],
                    "msg": "field required",
                    "type": "value_error.missing",
                },
            ],
        ],
        [
            1,
            {"url": "https://foo.bar"},
            422,
            [
                {
                    "loc": ["body", "lead"],
                    "msg": "field required",
                    "type": "value_error.missing",
                }
            ],
        ],
    ],
)
def test_update_lead_invalid(test_app, monkeypatch, lead_id, payload, status_code, detail):
    pass


def test_update_lead_invalid_url(test_app):
    response = test_app.put(
        f"/leads/1/",
        data=json.dumps({"url": "invalid://url", "lead": "updated!"}),
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "URL scheme not permitted"

def test_create_lead(test_app, monkeypatch):
    def mock_generate_lead(lead_id, url):
        return None
    monkeypatch.setattr(leads, "generate_lead", mock_generate_lead)
    test_request_payload = {"url": "https://foo.bar"}
    test_response_payload = {"id": 1, "url": "https://foo.bar"}

    async def mock_post(payload):
        return 1

    monkeypatch.setattr(crud, "post", mock_post)

    response = test_app.post("/leads/", data=json.dumps(test_request_payload),)

    assert response.status_code == 201
    assert response.json() == test_response_payload


def test_read_lead(test_app, monkeypatch):
    test_data = {
        "id": 1,
        "url": "https://foo.bar",
        "lead": "lead",
        "created_at": datetime.utcnow().isoformat(),
    }

    async def mock_get(id):
        return test_data

    monkeypatch.setattr(crud, "get", mock_get)

    response = test_app.get("/leads/1/")
    assert response.status_code == 200
    assert response.json() == test_data


def test_read_lead_incorrect_id(test_app, monkeypatch):
    async def mock_get(id):
        return None

    monkeypatch.setattr(crud, "get", mock_get)

    response = test_app.get("/leads/999/")
    assert response.status_code == 404
    assert response.json()["detail"] == "Lead not found"


def test_read_all_leads(test_app, monkeypatch):
    test_data = [
        {
            "id": 1,
            "url": "https://foo.bar",
            "lead": "lead",
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "id": 2,
            "url": "https://testdrivenn.io",
            "lead": "lead",
            "created_at": datetime.utcnow().isoformat(),
        }
    ]

    async def mock_get_all():
        return test_data

    monkeypatch.setattr(crud, "get_all", mock_get_all)

    response = test_app.get("/leads/")
    assert response.status_code == 200
    assert response.json() == test_data

def test_remove_lead(test_app, monkeypatch):
    async def mock_get(id):
        return {
            "id": 1,
            "url": "https://foo.bar",
            "lead": "lead",
            "created_at": datetime.utcnow().isoformat(),
        }

    monkeypatch.setattr(crud, "get", mock_get)

    async def mock_delete(id):
        return id

    monkeypatch.setattr(crud, "delete", mock_delete)

    response = test_app.delete("/leads/1/")
    assert response.status_code == 200
    
    assert response.json()["id"] == 1
    assert response.json()["url"] == "https://foo.bar"


def test_remove_lead_incorrect_id(test_app, monkeypatch):
    async def mock_get(id):
        return None

    monkeypatch.setattr(crud, "get", mock_get)

    response = test_app.delete("/leads/999/")
    assert response.status_code == 404
    assert response.json()["detail"] == "Lead not found"


def test_update_lead(test_app, monkeypatch):
    test_request_payload = {"url": "https://foo.bar", "lead": "updated"}
    test_response_payload = {
        "id": 1,
        "url": "https://foo.bar",
        "lead": "lead",
        "created_at": datetime.utcnow().isoformat(),
    }

    async def mock_put(id, payload):
        return test_response_payload

    monkeypatch.setattr(crud, "put", mock_put)

    response = test_app.put("/leads/1/", data=json.dumps(test_request_payload),)
    assert response.status_code == 200
    assert response.json() == test_response_payload


@pytest.mark.parametrize(
    "lead_id, payload, status_code, detail",
    [
        [
            999,
            {"url": "https://foo.bar", "lead": "updated!"},
            404,
            "Lead not found",
        ],
        [
            0,
            {"url": "https://foo.bar", "lead": "updated!"},
            422,
            [
                {
                    "loc": ["path", "id"],
                    "msg": "ensure this value is greater than 0",
                    "type": "value_error.number.not_gt",
                    "ctx": {"limit_value": 0},
                }
            ],
        ],
        [
            1,
            {},
            422,
            [
                {
                    "loc": ["body", "url"],
                    "msg": "field required",
                    "type": "value_error.missing",
                },
                {
                    "loc": ["body", "lead"],
                    "msg": "field required",
                    "type": "value_error.missing",
                },
            ],
        ],
        [
            1,
            {"url": "https://foo.bar"},
            422,
            [
                {
                    "loc": ["body", "lead"],
                    "msg": "field required",
                    "type": "value_error.missing",
                }
            ],
        ],
    ],
)
def test_update_lead_invalid(test_app, monkeypatch, lead_id, payload, status_code, detail):
    async def mock_put(id, payload):
        return None

    monkeypatch.setattr(crud, "put", mock_put)

    response = test_app.put(f"/leads/{lead_id}/", data=json.dumps(payload))
    assert response.status_code == status_code
    assert response.json()["detail"] == detail