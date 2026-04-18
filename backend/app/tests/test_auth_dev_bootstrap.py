import pytest
from httpx import AsyncClient

from app import models
from app.conftest import create_user
from app.core import conf
from app.core.db import session_context

pytestmark = pytest.mark.asyncio(loop_scope="module")


async def test_dev_bootstrap_superuser_returns_token(
    fresh_client: AsyncClient,
) -> None:
    email = str(conf.settings.FIRST_SUPERUSER_EMAIL)
    await create_user("Bootstrap1Pass", email=email, is_superuser=True)

    response = await fresh_client.post("/api/v1/auth/jwt/dev-bootstrap-superuser")

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]

    me_response = await fresh_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )

    assert me_response.status_code == 200
    assert me_response.json()["email"] == email
    assert me_response.json()["is_superuser"] is True


async def test_dev_bootstrap_superuser_returns_404_outside_dev_and_pytest(
    fresh_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(conf.settings, "ENVIRONMENT", "PROD")

    response = await fresh_client.post("/api/v1/auth/jwt/dev-bootstrap-superuser")

    assert response.status_code == 404
    assert response.json()["detail"] == "Not found"


async def test_dev_bootstrap_superuser_returns_503_when_bootstrap_user_missing(
    fresh_client: AsyncClient,
) -> None:
    response = await fresh_client.post("/api/v1/auth/jwt/dev-bootstrap-superuser")

    assert response.status_code == 503
    assert "FIRST_SUPERUSER_EMAIL" in response.json()["detail"]


async def test_dev_bootstrap_superuser_returns_503_when_bootstrap_user_not_superuser(
    fresh_client: AsyncClient,
) -> None:
    email = str(conf.settings.FIRST_SUPERUSER_EMAIL)
    await create_user("Bootstrap2Pass", email=email, is_superuser=False)

    response = await fresh_client.post("/api/v1/auth/jwt/dev-bootstrap-superuser")

    assert response.status_code == 503
    assert "not a superuser" in response.json()["detail"]


async def test_dev_bootstrap_superuser_returns_503_when_bootstrap_user_inactive(
    fresh_client: AsyncClient,
) -> None:
    email = str(conf.settings.FIRST_SUPERUSER_EMAIL)
    _, user_id = await create_user("Bootstrap3Pass", email=email, is_superuser=True)

    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        user.is_active = False
        await session.commit()

    response = await fresh_client.post("/api/v1/auth/jwt/dev-bootstrap-superuser")

    assert response.status_code == 503
    assert "inactive" in response.json()["detail"]
