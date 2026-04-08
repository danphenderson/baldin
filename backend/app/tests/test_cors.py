"""Regression coverage for browser preflight requests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core import conf
from app.core.correlation_id import REQUEST_ID_HEADER
from app.main import app

pytestmark = pytest.mark.asyncio

_ERROR_ROUTE_PATH = "/_test/cors-error"


async def _cors_test_error() -> None:
    raise RuntimeError("cors regression boom")


if not any(
    getattr(route, "path", None) == _ERROR_ROUTE_PATH for route in app.router.routes
):
    app.add_api_route(_ERROR_ROUTE_PATH, _cors_test_error, methods=["GET"])


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


async def test_internal_errors_keep_cors_headers_for_allowed_origin() -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    origin = str(conf.settings.BACKEND_CORS_ORIGINS[0]).rstrip("/")

    async with AsyncClient(
        transport=transport,
        base_url=origin,
    ) as client:
        response = await client.get(
            _ERROR_ROUTE_PATH,
            headers={"Origin": origin},
        )

    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == origin
    assert REQUEST_ID_HEADER.lower() in {k.lower() for k in response.headers.keys()}
    assert response.json()["detail"] == "cors regression boom"
    assert response.json()["request_id"]
