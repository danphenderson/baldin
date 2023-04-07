# tests/test_searches.py


import pytest
from fastapi import Response

@pytest.fixture(scope="function")
def search_payload() -> dict:
    return {
      "keywords": "Lead Software Engineer",
      "platform": "linkedin"
    }

@pytest.fixture(scope="function")
def search_payload_missing_keywords() -> dict:
    return {
      "platform": "linkedin"
    }

@pytest.fixture(scope="function")
def search_payload_missing_platform() -> dict:
    return {
      "keywords": "Lead Software Engineer"
    }

@pytest.fixture(scope="function")
def search_response(search_payload) -> dict:
    return {
      "keywords": search_payload["keywords"],
      "platform": search_payload["platform"]
    }


@pytest.fixture(scope="function")
def posted_search(test_client, search_payload) -> Response:
    return test_client.post("/searches/", json=search_payload)


def test_create_search(search_payload, posted_search):
    assert posted_search.status_code == 201
    if not posted_search.json():
        assert False
    for key, _ in search_payload.items():
        assert search_payload[key] == posted_search.json()[key]

def test_create_search_missing_keywords(search_payload_missing_keywords, test_client):
    posted_search = test_client.post("/searches/", json=search_payload_missing_keywords)
    assert posted_search.status_code == 422
    assert posted_search.json() == {
        "detail": [
            {
                "loc": [
                    "body",
                    "keywords"
                ],
                "msg": "field required",
                "type": "value_error.missing"
            }
        ]
    }


def test_create_search_missing_platform(search_payload_missing_platform, test_client):
    posted_search = test_client.post("/searches/", json=search_payload_missing_platform)
    assert posted_search.status_code == 422
    assert posted_search.json() == {
        "detail": [
            {
                "loc": [
                    "body",
                    "platform"
                ],
                "msg": "field required",
                "type": "value_error.missing"
            }
        ]
    }
 

def test_get_search(posted_search, search_payload, test_client):
    search_id = posted_search.json()["id"]
    response = test_client.get(f"/searches/{search_id}")
    assert response.status_code == 200
    for key, _ in search_payload.items():
        assert search_payload[key] == posted_search.json()[key]

@pytest.mark.xfail
def test_get_searches(test_client, posted_search):
    response = test_client.get("/searches/")
    assert response.status_code == 200
    assert response.json() == [posted_search.json()]

@pytest.mark.xfail
def test_get_searches_by_platform(test_client, posted_search):
    response = test_client.get("/searches/?platform=linkedin")
    assert response.status_code == 200
    assert response.json() == [posted_search.json()]

@pytest.mark.xfail
def test_get_searches_by_keywords(test_client, posted_search):
    response = test_client.get("/searches/?keywords=Lead Software Engineer")
    assert response.status_code == 200
    assert response.json() == [posted_search.json()]

@pytest.mark.xfail
def test_get_searches_by_keywords_and_platform(test_client, posted_search):
    response = test_client.get("/searches/?keywords=Lead Software Engineer&platform=linkedin")
    assert response.status_code == 200
    assert response.json() == [posted_search.json()]

@pytest.mark.xfail
def test_get_searches_by_keywords_and_platform_no_results(test_client, posted_search):
    response = test_client.get("/searches/?keywords=Lead Software Engineer&platform=indeed")
    assert response.status_code == 200
    assert response.json() == []