# tests/conftest.py


import os
from typing import Generator

import pytest
from starlette.testclient import TestClient
from tortoise.contrib.fastapi import register_tortoise
from app.main import create_application
from app.conf import get_settings, Settings

def get_settings_override() -> Settings:
    return get_settings(testing=bool(1), database_url=os.getenv("DATABASE_TEST_URL")) # type: ignore


@pytest.fixture(scope="module")
def test_app():
    # override config settings
    app = create_application()
    app.dependency_overrides[get_settings] = get_settings_override
    with TestClient(app) as test_client:
        yield test_client
    
    # tear down

@pytest.fixture(scope="module")
def test_app_with_db():
    # set up
    app = create_application()
    app.dependency_overrides[get_settings] = get_settings_override
    register_tortoise(
        app,
        db_url=os.environ.get("DATABASE_TEST_URL"),
        modules={"models": ["app.models.tortoise"]},
        generate_schemas=True,
        add_exception_handlers=True,
    )


    # tear down