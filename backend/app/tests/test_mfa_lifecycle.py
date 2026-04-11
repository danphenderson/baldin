"""Full MFA lifecycle integration test.

Story 3.6 — exercises the complete MFA journey within a single test:

    register → login normally → enable MFA → login (mfa_required) →
    complete TOTP login → disable MFA → login normally again

This complements the granular tests in test_auth_mfa.py that exercise
individual MFA endpoints in isolation.
"""

from contextlib import asynccontextmanager
from uuid import UUID

import pyotp
import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient

from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False


@asynccontextmanager
async def _client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


async def _ensure_db_ready() -> None:
    global _db_ready
    if _db_ready:
        return
    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    app.state.bootstrap_completed = True
    _db_ready = True


async def _create_user(
    password: str, *, is_superuser: bool = False
) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=is_superuser,
        )
        await session.commit()
    return email, user.id


# ---------------------------------------------------------------------------
# Full lifecycle test
# ---------------------------------------------------------------------------


async def test_full_mfa_lifecycle() -> None:
    """Walk through the entire MFA journey for a single user.

    Steps:
        1. Create a user and verify normal (non-MFA) login returns a token.
        2. Enable MFA: POST /auth/mfa/setup → get secret + provisioning URI.
        3. Verify MFA setup: POST /auth/mfa/verify with a valid TOTP code.
        4. Confirm MFA status is enabled via GET /auth/mfa/status.
        5. Login again — server returns mfa_required + mfa_token, no access_token.
        6. Complete MFA login: POST /auth/mfa/login-verify with TOTP → get access_token.
        7. Use the MFA-issued access_token to call a protected endpoint.
        8. Disable MFA: POST /auth/mfa/disable with a valid TOTP code.
        9. Confirm MFA status is disabled.
       10. Login once more — should get a plain access_token (no MFA challenge).
    """
    await _ensure_db_ready()
    password = "Lifecycle1Mfa"
    email, user_id = await _create_user(password)

    async with _client() as client:
        # ── Step 1: Normal login (no MFA) ─────────────────────────────────
        login_resp = await client.post(
            "/api/v1/auth/jwt/login",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login_resp.status_code == 200
        body = login_resp.json()
        assert "access_token" in body
        assert body.get("mfa_required") is None
        normal_token = body["access_token"]
        headers = {"Authorization": f"Bearer {normal_token}"}

        # ── Step 2: MFA setup ─────────────────────────────────────────────
        setup_resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
        assert setup_resp.status_code == 200
        setup_body = setup_resp.json()
        secret = setup_body["secret"]
        assert setup_body["provisioning_uri"].startswith("otpauth://totp/")

        # ── Step 3: Verify MFA with a valid TOTP code ────────────────────
        totp = pyotp.TOTP(secret)
        code = totp.now()
        verify_resp = await client.post(
            "/api/v1/auth/mfa/verify", json={"code": code}, headers=headers
        )
        assert verify_resp.status_code == 200
        assert verify_resp.json()["mfa_enabled"] is True

        # ── Step 4: Confirm MFA status ────────────────────────────────────
        status_resp = await client.get("/api/v1/auth/mfa/status", headers=headers)
        assert status_resp.status_code == 200
        assert status_resp.json()["mfa_enabled"] is True

        # ── Step 5: Login now triggers MFA challenge ──────────────────────
        mfa_login_resp = await client.post(
            "/api/v1/auth/jwt/login",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert mfa_login_resp.status_code == 200
        mfa_body = mfa_login_resp.json()
        assert mfa_body["mfa_required"] is True
        assert "mfa_token" in mfa_body
        assert "access_token" not in mfa_body
        mfa_token = mfa_body["mfa_token"]

        # ── Step 6: Complete MFA login with TOTP ──────────────────────────
        mfa_code = pyotp.TOTP(secret).now()
        mfa_verify_resp = await client.post(
            "/api/v1/auth/mfa/login-verify",
            json={"mfa_token": mfa_token, "code": mfa_code},
        )
        assert mfa_verify_resp.status_code == 200
        mfa_access_token = mfa_verify_resp.json()["access_token"]
        mfa_headers = {"Authorization": f"Bearer {mfa_access_token}"}

        # ── Step 7: Use the MFA-issued token on a protected endpoint ──────
        me_resp = await client.get("/api/v1/users/me", headers=mfa_headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == email

        # ── Step 8: Disable MFA ───────────────────────────────────────────
        disable_code = pyotp.TOTP(secret).now()
        disable_resp = await client.post(
            "/api/v1/auth/mfa/disable",
            json={"code": disable_code},
            headers=mfa_headers,
        )
        assert disable_resp.status_code == 200
        assert disable_resp.json()["mfa_enabled"] is False

        # ── Step 9: Confirm MFA status is disabled ────────────────────────
        status_resp2 = await client.get("/api/v1/auth/mfa/status", headers=mfa_headers)
        assert status_resp2.status_code == 200
        assert status_resp2.json()["mfa_enabled"] is False

        # ── Step 10: Login without MFA again ──────────────────────────────
        final_login = await client.post(
            "/api/v1/auth/jwt/login",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert final_login.status_code == 200
        final_body = final_login.json()
        assert "access_token" in final_body
        assert final_body.get("mfa_required") is None
