"""Regression coverage for browser preflight requests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core import conf
from app.main import app

pytestmark = pytest.mark.asyncio


async def test_preflight_allows_configured_frontend_origin() -> None:
    transport = ASGITransport(app=app)
    origin = str(conf.settings.BACKEND_CORS_ORIGINS[0]).rstrip("/")

    async with AsyncClient(
        transport=transport,
        base_url=origin,
    ) as client:
        response = await client.options(
            "/users/me",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
