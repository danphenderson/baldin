# Path: app/api/routes/mfa.py
"""
Two-Factor Authentication (TOTP) management endpoints.

- POST /setup        – generate a new TOTP secret
- POST /verify       – confirm setup with a valid 6-digit code
- POST /disable      – turn MFA off (requires valid code)
- GET  /status       – return current MFA enrolment state
- POST /login-verify – complete MFA challenge during login
"""

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request
from jwt import PyJWTError
from pydantic import UUID4

from app import models, schemas
from app.core.conf import settings
from app.core.rate_limit import limiter
from app.core.security import (
    AUTH_BACKEND,
    decrypt_mfa_secret,
    encrypt_mfa_secret,
    get_current_superuser,
    get_current_user,
    get_jwt_strategy,
    verify_mfa_token,
)

router = APIRouter()


def _provisioning_uri(secret: str, email: str) -> str:
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=settings.PROJECT_NAME)


@router.get("/status", response_model=schemas.MFAStatusResponse)
async def mfa_status(
    current_user: models.User = Depends(get_current_user),
):
    """Return whether MFA is currently enabled for the authenticated user."""
    return schemas.MFAStatusResponse(mfa_enabled=current_user.mfa_enabled)


@router.post("/setup", response_model=schemas.MFASetupResponse)
@limiter.limit("5/minute")
async def mfa_setup(
    request: Request,
    current_user: models.User = Depends(get_current_user),
):
    """Generate a fresh TOTP secret.

    The secret is persisted on the user record but MFA is **not** active
    until the user confirms setup via ``POST /verify``.
    """
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=400,
            detail="MFA is already enabled. Disable it first to reconfigure.",
        )

    from app.core.db import session_context

    secret = pyotp.random_base32()

    async with session_context() as session:
        user = await session.get(models.User, current_user.id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found.")
        user.mfa_secret = encrypt_mfa_secret(secret)
        session.add(user)
        await session.commit()

    return schemas.MFASetupResponse(
        secret=secret,
        provisioning_uri=_provisioning_uri(secret, current_user.email),
    )


@router.post("/verify", response_model=schemas.MFAStatusResponse)
@limiter.limit("10/minute")
async def mfa_verify_setup(
    request: Request,
    body: schemas.MFAVerifyRequest,
    current_user: models.User = Depends(get_current_user),
):
    """Confirm MFA setup by presenting a valid TOTP code.

    This activates MFA on the account.
    """
    if current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is already enabled.")
    secret, _ = decrypt_mfa_secret(current_user.mfa_secret)
    if not secret:
        raise HTTPException(
            status_code=400, detail="Call /setup first to generate a secret."
        )

    totp = pyotp.TOTP(secret)
    if not totp.verify(body.code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code.")

    from app.core.db import session_context

    async with session_context() as session:
        user = await session.get(models.User, current_user.id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found.")
        user.mfa_enabled = True
        user.mfa_secret = encrypt_mfa_secret(secret)
        session.add(user)
        await session.commit()

    return schemas.MFAStatusResponse(mfa_enabled=True)


@router.post("/disable", response_model=schemas.MFAStatusResponse)
@limiter.limit("5/minute")
async def mfa_disable(
    request: Request,
    body: schemas.MFAVerifyRequest,
    current_user: models.User = Depends(get_current_user),
):
    """Disable MFA by presenting a valid TOTP code."""
    if not current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is not enabled.")

    secret, _ = decrypt_mfa_secret(current_user.mfa_secret)
    if not secret:
        raise HTTPException(status_code=400, detail="MFA is not enabled.")

    totp = pyotp.TOTP(secret)
    if not totp.verify(body.code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code.")

    from app.core.db import session_context

    async with session_context() as session:
        user = await session.get(models.User, current_user.id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found.")
        user.mfa_enabled = False
        user.mfa_secret = None
        session.add(user)
        await session.commit()

    return schemas.MFAStatusResponse(mfa_enabled=False)


@router.post("/admin-reset/{user_id}", response_model=schemas.MFAAdminResetResponse)
async def mfa_admin_reset(
    user_id: UUID4,
    _current_superuser: models.User = Depends(get_current_superuser),
):
    """Reset MFA for a user when they have lost access to their authenticator."""
    from app.core.db import session_context

    async with session_context() as session:
        user = await session.get(models.User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found.")
        user.mfa_enabled = False
        user.mfa_secret = None
        session.add(user)
        await session.commit()

    return schemas.MFAAdminResetResponse(user_id=user_id, mfa_enabled=False)


@router.post("/login-verify", response_model=schemas.BearerResponse)
@limiter.limit("10/minute")
async def mfa_login_verify(request: Request, body: schemas.MFALoginVerifyRequest):
    """Complete the MFA login challenge.

    Accepts the short-lived ``mfa_token`` returned by ``POST /auth/jwt/login``
    together with a valid TOTP code and returns a full-access JWT.
    """
    try:
        user_id = verify_mfa_token(body.mfa_token)
    except (PyJWTError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid or expired MFA token.")

    from app.core.db import session_context

    async with session_context() as session:
        user = await session.get(models.User, user_id)
        if user is None or not user.is_active:
            raise HTTPException(status_code=400, detail="Invalid or expired MFA token.")
        secret, was_encrypted = decrypt_mfa_secret(user.mfa_secret)
        if not user.mfa_enabled or not secret:
            raise HTTPException(status_code=400, detail="MFA is not enabled.")

        totp = pyotp.TOTP(secret)
        if not totp.verify(body.code):
            raise HTTPException(status_code=400, detail="Invalid TOTP code.")

        if not was_encrypted:
            user.mfa_secret = encrypt_mfa_secret(secret)
            session.add(user)
            await session.commit()

    strategy = get_jwt_strategy()
    response = await AUTH_BACKEND.login(strategy, user)
    return response
