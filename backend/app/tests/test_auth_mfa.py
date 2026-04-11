"""Tests for password validation and MFA (Two-Factor Authentication) flows."""

from contextlib import asynccontextmanager
from uuid import UUID

import pyotp
import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient

from app import models
from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.core.security import (
    create_mfa_token,
    decrypt_mfa_secret,
    encrypt_mfa_secret,
    verify_mfa_token,
)
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


async def _auth_headers(
    client: AsyncClient, email: str, password: str
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Part 1 – Password validation on registration
# ---------------------------------------------------------------------------


async def test_register_empty_password_rejected() -> None:
    """An empty password must be rejected at registration."""
    await _ensure_db_ready()
    async with _client() as client:
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": utils.random_email(),
                "password": "",
            },
        )
    assert resp.status_code == 400
    assert "password" in resp.json()["detail"]["reason"].lower()


async def test_register_short_password_rejected() -> None:
    """A password shorter than 8 characters must be rejected."""
    await _ensure_db_ready()
    async with _client() as client:
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": utils.random_email(),
                "password": "Ab1",
            },
        )
    assert resp.status_code == 400
    assert "8 characters" in resp.json()["detail"]["reason"]


async def test_register_no_uppercase_rejected() -> None:
    """A password with no uppercase letter must be rejected."""
    await _ensure_db_ready()
    async with _client() as client:
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": utils.random_email(),
                "password": "abcdefg1",
            },
        )
    assert resp.status_code == 400
    assert "uppercase" in resp.json()["detail"]["reason"].lower()


async def test_register_no_digit_rejected() -> None:
    """A password with no digit must be rejected."""
    await _ensure_db_ready()
    async with _client() as client:
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": utils.random_email(),
                "password": "Abcdefgh",
            },
        )
    assert resp.status_code == 400
    assert "digit" in resp.json()["detail"]["reason"].lower()


async def test_register_valid_password_succeeds() -> None:
    """A password meeting all requirements must be accepted."""
    await _ensure_db_ready()
    async with _client() as client:
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": utils.random_email(),
                "password": "Str0ngPwd!",
            },
        )
    assert resp.status_code == 201


# ---------------------------------------------------------------------------
# Part 2 – Login (non-MFA) still works
# ---------------------------------------------------------------------------


async def test_login_non_mfa_returns_token() -> None:
    """Users without MFA get a normal access token on login."""
    await _ensure_db_ready()
    email, _ = await _create_user("Login1Pass")
    async with _client() as client:
        resp = await client.post(
            "/api/v1/auth/jwt/login",
            data={"username": email, "password": "Login1Pass"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body.get("mfa_required") is None


# ---------------------------------------------------------------------------
# Part 3 – MFA setup, verify, status, disable
# ---------------------------------------------------------------------------


async def test_mfa_status_initially_disabled() -> None:
    """Newly created users have MFA disabled."""
    await _ensure_db_ready()
    email, _ = await _create_user("Mfa1Status")
    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1Status")
        resp = await client.get("/api/v1/auth/mfa/status", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["mfa_enabled"] is False


async def test_mfa_setup_returns_secret_and_uri() -> None:
    """POST /auth/mfa/setup should return a TOTP secret and provisioning URI."""
    await _ensure_db_ready()
    email, _ = await _create_user("Mfa1Setup")
    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1Setup")
        resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "secret" in body
    assert body["provisioning_uri"].startswith("otpauth://totp/")


async def test_mfa_setup_persists_secret_encrypted_at_rest() -> None:
    """The TOTP secret should not be stored in plaintext in the database."""
    await _ensure_db_ready()
    email, user_id = await _create_user("Mfa1Encrypt")
    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1Encrypt")
        resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)

    secret = resp.json()["secret"]

    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        assert user.mfa_secret != secret
        assert decrypt_mfa_secret(user.mfa_secret) == (secret, True)


async def test_mfa_verify_activates_mfa() -> None:
    """Verifying a valid TOTP code after setup should activate MFA."""
    await _ensure_db_ready()
    email, _ = await _create_user("Mfa1Verify")
    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1Verify")

        # Setup
        setup_resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
        secret = setup_resp.json()["secret"]

        # Generate a valid TOTP code
        totp = pyotp.TOTP(secret)
        code = totp.now()

        # Verify
        verify_resp = await client.post(
            "/api/v1/auth/mfa/verify", json={"code": code}, headers=headers
        )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["mfa_enabled"] is True


async def test_mfa_verify_invalid_code_rejected() -> None:
    """An invalid TOTP code should be rejected during verification."""
    await _ensure_db_ready()
    email, _ = await _create_user("Mfa1BadCode")
    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1BadCode")

        await client.post("/api/v1/auth/mfa/setup", headers=headers)

        resp = await client.post(
            "/api/v1/auth/mfa/verify", json={"code": "000000"}, headers=headers
        )
    assert resp.status_code == 400
    assert "invalid" in resp.json()["detail"].lower()


async def test_mfa_setup_blocked_when_already_enabled() -> None:
    """Calling setup when MFA is already enabled should return 400."""
    await _ensure_db_ready()
    email, _ = await _create_user("Mfa1Block")
    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1Block")

        setup_resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
        secret = setup_resp.json()["secret"]
        code = pyotp.TOTP(secret).now()
        await client.post(
            "/api/v1/auth/mfa/verify", json={"code": code}, headers=headers
        )

        # Second setup should fail
        resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    assert resp.status_code == 400
    assert "already enabled" in resp.json()["detail"].lower()


async def test_mfa_disable_works() -> None:
    """Disabling MFA with a valid code should succeed."""
    await _ensure_db_ready()
    email, _ = await _create_user("Mfa1Disable")
    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1Disable")

        setup_resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
        secret = setup_resp.json()["secret"]
        code = pyotp.TOTP(secret).now()
        await client.post(
            "/api/v1/auth/mfa/verify", json={"code": code}, headers=headers
        )

        # Disable with a fresh code
        disable_code = pyotp.TOTP(secret).now()
        resp = await client.post(
            "/api/v1/auth/mfa/disable", json={"code": disable_code}, headers=headers
        )
    assert resp.status_code == 200
    assert resp.json()["mfa_enabled"] is False


# ---------------------------------------------------------------------------
# Part 4 – MFA-aware login flow
# ---------------------------------------------------------------------------


async def _enable_mfa(client: AsyncClient, headers: dict[str, str]) -> str:
    """Helper: enable MFA for a user and return the TOTP secret."""
    setup_resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    secret = setup_resp.json()["secret"]
    code = pyotp.TOTP(secret).now()
    await client.post("/api/v1/auth/mfa/verify", json={"code": code}, headers=headers)
    return secret


async def test_login_mfa_returns_challenge() -> None:
    """Login with valid credentials but MFA enabled returns mfa_required."""
    await _ensure_db_ready()
    email, _ = await _create_user("Mfa1Login")
    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1Login")
        await _enable_mfa(client, headers)

        resp = await client.post(
            "/api/v1/auth/jwt/login",
            data={"username": email, "password": "Mfa1Login"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["mfa_required"] is True
    assert "mfa_token" in body
    # Should NOT contain an access_token
    assert "access_token" not in body


async def test_mfa_login_verify_issues_token() -> None:
    """Completing MFA verification with the login token returns a JWT."""
    await _ensure_db_ready()
    email, _ = await _create_user("Mfa1Full")
    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1Full")
        secret = await _enable_mfa(client, headers)

        # First step: get MFA challenge
        login_resp = await client.post(
            "/api/v1/auth/jwt/login",
            data={"username": email, "password": "Mfa1Full"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        mfa_token = login_resp.json()["mfa_token"]

        # Second step: verify TOTP
        code = pyotp.TOTP(secret).now()
        verify_resp = await client.post(
            "/api/v1/auth/mfa/login-verify",
            json={"mfa_token": mfa_token, "code": code},
        )
    assert verify_resp.status_code == 200
    assert "access_token" in verify_resp.json()


async def test_mfa_login_verify_bad_code_rejected() -> None:
    """An invalid TOTP code during login verify should be rejected."""
    await _ensure_db_ready()
    email, _ = await _create_user("Mfa1Bad")
    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1Bad")
        await _enable_mfa(client, headers)

        login_resp = await client.post(
            "/api/v1/auth/jwt/login",
            data={"username": email, "password": "Mfa1Bad"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        mfa_token = login_resp.json()["mfa_token"]

        resp = await client.post(
            "/api/v1/auth/mfa/login-verify",
            json={"mfa_token": mfa_token, "code": "000000"},
        )
    assert resp.status_code == 400
    assert "invalid" in resp.json()["detail"].lower()


async def test_mfa_login_verify_bad_token_rejected() -> None:
    """An invalid mfa_token should be rejected."""
    await _ensure_db_ready()
    async with _client() as client:
        resp = await client.post(
            "/api/v1/auth/mfa/login-verify",
            json={"mfa_token": "garbage.token.here", "code": "123456"},
        )
    assert resp.status_code == 400


async def test_mfa_admin_reset_disables_target_user() -> None:
    """A superuser can reset MFA for a locked-out user."""
    await _ensure_db_ready()
    email, user_id = await _create_user("Mfa1Target")
    admin_email, _ = await _create_user("Admin1Reset", is_superuser=True)

    async with _client() as client:
        headers = await _auth_headers(client, email, "Mfa1Target")
        await _enable_mfa(client, headers)
        admin_headers = await _auth_headers(client, admin_email, "Admin1Reset")

        reset_resp = await client.post(
            f"/api/v1/auth/mfa/admin-reset/{user_id}", headers=admin_headers
        )
        login_resp = await client.post(
            "/api/v1/auth/jwt/login",
            data={"username": email, "password": "Mfa1Target"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    assert reset_resp.status_code == 200
    assert reset_resp.json() == {"user_id": str(user_id), "mfa_enabled": False}
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


# ---------------------------------------------------------------------------
# Part 5 – MFA token unit tests
# ---------------------------------------------------------------------------


async def test_mfa_token_roundtrip() -> None:
    """create_mfa_token / verify_mfa_token should round-trip a user id."""
    import uuid

    uid = uuid.uuid4()
    token = create_mfa_token(uid)
    assert verify_mfa_token(token) == uid


async def test_mfa_secret_decryption_supports_legacy_plaintext() -> None:
    """Legacy plaintext MFA secrets remain readable until they are rotated."""
    secret = "JBSWY3DPEHPK3PXP"
    assert decrypt_mfa_secret(secret) == (secret, False)
    assert decrypt_mfa_secret(encrypt_mfa_secret(secret)) == (secret, True)
