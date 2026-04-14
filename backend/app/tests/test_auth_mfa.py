"""Tests for password validation and MFA (Two-Factor Authentication) flows."""

import pyotp
import pytest
from httpx import AsyncClient

from app import models
from app.conftest import create_user, login_and_get_headers
from app.core.db import session_context
from app.core.security import (
    create_mfa_token,
    decrypt_mfa_secret,
    encrypt_mfa_secret,
    verify_mfa_token,
)
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")


# ---------------------------------------------------------------------------
# Part 1 – Password validation on registration
# ---------------------------------------------------------------------------


async def test_register_empty_password_rejected(
    client: AsyncClient, ensure_db: None
) -> None:
    """An empty password must be rejected at registration."""
    del ensure_db
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": utils.random_email(),
            "password": "",
        },
    )
    assert resp.status_code == 400
    assert "password" in resp.json()["detail"]["reason"].lower()


async def test_register_short_password_rejected(
    client: AsyncClient, ensure_db: None
) -> None:
    """A password shorter than 8 characters must be rejected."""
    del ensure_db
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": utils.random_email(),
            "password": "Ab1",
        },
    )
    assert resp.status_code == 400
    assert "8 characters" in resp.json()["detail"]["reason"]


async def test_register_no_uppercase_rejected(
    client: AsyncClient, ensure_db: None
) -> None:
    """A password with no uppercase letter must be rejected."""
    del ensure_db
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": utils.random_email(),
            "password": "abcdefg1",
        },
    )
    assert resp.status_code == 400
    assert "uppercase" in resp.json()["detail"]["reason"].lower()


async def test_register_no_digit_rejected(client: AsyncClient, ensure_db: None) -> None:
    """A password with no digit must be rejected."""
    del ensure_db
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": utils.random_email(),
            "password": "Abcdefgh",
        },
    )
    assert resp.status_code == 400
    assert "digit" in resp.json()["detail"]["reason"].lower()


async def test_register_valid_password_succeeds(
    client: AsyncClient, ensure_db: None
) -> None:
    """A password meeting all requirements must be accepted."""
    del ensure_db
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


async def test_login_non_mfa_returns_token(
    client: AsyncClient, ensure_db: None
) -> None:
    """Users without MFA get a normal access token on login."""
    del ensure_db
    email, _ = await create_user("Login1Pass")
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


async def test_mfa_status_initially_disabled(
    client: AsyncClient, ensure_db: None
) -> None:
    """Newly created users have MFA disabled."""
    del ensure_db
    email, _ = await create_user("Mfa1Status")
    headers = await login_and_get_headers(client, email, "Mfa1Status")
    resp = await client.get("/api/v1/auth/mfa/status", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["mfa_enabled"] is False


async def test_mfa_setup_returns_secret_and_uri(
    client: AsyncClient, ensure_db: None
) -> None:
    """POST /auth/mfa/setup should return a TOTP secret and provisioning URI."""
    del ensure_db
    email, _ = await create_user("Mfa1Setup")
    headers = await login_and_get_headers(client, email, "Mfa1Setup")
    resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "secret" in body
    assert body["provisioning_uri"].startswith("otpauth://totp/")


async def test_mfa_setup_persists_secret_encrypted_at_rest(
    client: AsyncClient, ensure_db: None
) -> None:
    """The TOTP secret should not be stored in plaintext in the database."""
    del ensure_db
    email, user_id = await create_user("Mfa1Encrypt")
    headers = await login_and_get_headers(client, email, "Mfa1Encrypt")
    resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)

    secret = resp.json()["secret"]

    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        assert user.mfa_secret != secret
        assert decrypt_mfa_secret(user.mfa_secret) == (secret, True)


async def test_mfa_verify_activates_mfa(client: AsyncClient, ensure_db: None) -> None:
    """Verifying a valid TOTP code after setup should activate MFA."""
    del ensure_db
    email, _ = await create_user("Mfa1Verify")
    headers = await login_and_get_headers(client, email, "Mfa1Verify")

    setup_resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    secret = setup_resp.json()["secret"]
    totp = pyotp.TOTP(secret)
    code = totp.now()
    verify_resp = await client.post(
        "/api/v1/auth/mfa/verify", json={"code": code}, headers=headers
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["mfa_enabled"] is True


async def test_mfa_verify_invalid_code_rejected(
    client: AsyncClient, ensure_db: None
) -> None:
    """An invalid TOTP code should be rejected during verification."""
    del ensure_db
    email, _ = await create_user("Mfa1BadCode")
    headers = await login_and_get_headers(client, email, "Mfa1BadCode")
    await client.post("/api/v1/auth/mfa/setup", headers=headers)
    resp = await client.post(
        "/api/v1/auth/mfa/verify", json={"code": "000000"}, headers=headers
    )
    assert resp.status_code == 400
    assert "invalid" in resp.json()["detail"].lower()


async def test_mfa_setup_blocked_when_already_enabled(
    client: AsyncClient, ensure_db: None
) -> None:
    """Calling setup when MFA is already enabled should return 400."""
    del ensure_db
    email, _ = await create_user("Mfa1Block")
    headers = await login_and_get_headers(client, email, "Mfa1Block")

    setup_resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    secret = setup_resp.json()["secret"]
    code = pyotp.TOTP(secret).now()
    await client.post("/api/v1/auth/mfa/verify", json={"code": code}, headers=headers)

    resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    assert resp.status_code == 400
    assert "already enabled" in resp.json()["detail"].lower()


async def test_mfa_disable_works(client: AsyncClient, ensure_db: None) -> None:
    """Disabling MFA with a valid code should succeed."""
    del ensure_db
    email, _ = await create_user("Mfa1Disable")
    headers = await login_and_get_headers(client, email, "Mfa1Disable")

    setup_resp = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    secret = setup_resp.json()["secret"]
    code = pyotp.TOTP(secret).now()
    await client.post("/api/v1/auth/mfa/verify", json={"code": code}, headers=headers)

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


async def test_login_mfa_returns_challenge(
    client: AsyncClient, ensure_db: None
) -> None:
    """Login with valid credentials but MFA enabled returns mfa_required."""
    del ensure_db
    email, _ = await create_user("Mfa1Login")
    headers = await login_and_get_headers(client, email, "Mfa1Login")
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


async def test_mfa_login_verify_issues_token(
    client: AsyncClient, ensure_db: None
) -> None:
    """Completing MFA verification with the login token returns a JWT."""
    del ensure_db
    email, _ = await create_user("Mfa1Full")
    headers = await login_and_get_headers(client, email, "Mfa1Full")
    secret = await _enable_mfa(client, headers)

    login_resp = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": "Mfa1Full"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    mfa_token = login_resp.json()["mfa_token"]

    code = pyotp.TOTP(secret).now()
    verify_resp = await client.post(
        "/api/v1/auth/mfa/login-verify",
        json={"mfa_token": mfa_token, "code": code},
    )
    assert verify_resp.status_code == 200
    assert "access_token" in verify_resp.json()


async def test_mfa_login_verify_bad_code_rejected(
    client: AsyncClient, ensure_db: None
) -> None:
    """An invalid TOTP code during login verify should be rejected."""
    del ensure_db
    email, _ = await create_user("Mfa1Bad")
    headers = await login_and_get_headers(client, email, "Mfa1Bad")
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


async def test_mfa_login_verify_bad_token_rejected(
    client: AsyncClient, ensure_db: None
) -> None:
    """An invalid mfa_token should be rejected."""
    del ensure_db
    resp = await client.post(
        "/api/v1/auth/mfa/login-verify",
        json={"mfa_token": "garbage.token.here", "code": "123456"},
    )
    assert resp.status_code == 400


async def test_mfa_admin_reset_disables_target_user(
    client: AsyncClient, ensure_db: None
) -> None:
    """A superuser can reset MFA for a locked-out user."""
    del ensure_db
    email, user_id = await create_user("Mfa1Target")
    admin_email, _ = await create_user("Admin1Reset", is_superuser=True)

    headers = await login_and_get_headers(client, email, "Mfa1Target")
    await _enable_mfa(client, headers)
    admin_headers = await login_and_get_headers(client, admin_email, "Admin1Reset")

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
