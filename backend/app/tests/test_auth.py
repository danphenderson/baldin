# Path: app/tests/test_auth.py

"""
Testing FastAPI Users makes no sense, its just an example to remove.
"""

import pytest

from app.schemas import UserRead


@pytest.mark.xfail
@pytest.mark.asyncio
async def test_login_endpoints(test_client, default_user: UserRead):
    async for client in test_client:  # This line handles the async generator
        access_token_res = await client.post(
            "/auth/jwt/login",
            data={
                "username": "geralt@wiedzmin.pl",
                "password": "geralt",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert access_token_res.status_code == 200
        token = access_token_res.json()

        access_token = token["access_token"]

        test_token = await client.get(
            "/users/me", headers={"Authorization": f"Bearer {access_token}"}
        )
        assert test_token.status_code == 200
