# Path: app/api/routes/auth.py
"""
Custom authentication routes that extend fastapi-users with MFA awareness.

The default ``/auth/jwt/login`` endpoint is replaced with a version that
returns an MFA challenge (``mfa_required + mfa_token``) when the user has
two-factor authentication enabled, instead of immediately issuing an
access token.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from app import models, schemas
from app.core.security import (
    AUTH_BACKEND,
    create_mfa_token,
    fastapi_users,
    get_jwt_strategy,
    get_user_manager,
)

router = APIRouter()

_get_current_user_token = fastapi_users.authenticator.current_user_token(active=True)


@router.post("/login")
async def login(
    request: Request,
    credentials: OAuth2PasswordRequestForm = Depends(),
    user_manager=Depends(get_user_manager),
):
    """Authenticate with email + password.

    * If MFA is **disabled** → returns ``{ access_token, token_type }``.
    * If MFA is **enabled** → returns ``{ mfa_required, mfa_token }``
      and the client must call ``POST /auth/mfa/login-verify`` to
      complete authentication.
    """
    user = await user_manager.authenticate(credentials)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LOGIN_BAD_CREDENTIALS",
        )

    # MFA gate: return a challenge token instead of a full access token
    if getattr(user, "mfa_enabled", False):
        return schemas.MFALoginRequired(
            mfa_required=True,
            mfa_token=create_mfa_token(user.id),
        )

    strategy = get_jwt_strategy()
    response = await AUTH_BACKEND.login(strategy, user)
    await user_manager.on_after_login(user, request, response)
    return response


@router.post("/logout")
async def logout(
    user_token: tuple[models.User, str] = Depends(_get_current_user_token),
):
    strategy = get_jwt_strategy()
    user, token = user_token
    return await AUTH_BACKEND.logout(strategy, user, token)
