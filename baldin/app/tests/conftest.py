# tests/conftest.py


import os
from typing import Generator

import pytest
from starlette.testclient import TestClient
from tortoise.contrib.fastapi import register_tortoise
from app.main import create_application
from app.conf import settings, Settings


@pytest.fixture(scope="module")
def test_app():
    # override config settings
    app = create_application()
    with TestClient(app) as test_client:
        yield test_client
    
    # tear down

@pytest.fixture(scope="module")
def test_app_with_db():
    # set up
    app = create_application()
    register_tortoise(
        app,
        db_url=settings.database_test_url,
        modules={"models": ["app.models.tortoise"]},
        generate_schemas=True,
        add_exception_handlers=True,
    )
    with TestClient(app) as test_client:
        yield test_client