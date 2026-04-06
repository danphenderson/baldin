"""Regression tests for default superuser bootstrap safeguards."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core import security

pytestmark = pytest.mark.asyncio


async def test_create_default_superuser_skips_existing_superuser(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    existing_superuser = SimpleNamespace(is_superuser=True)
    create_user = AsyncMock()

    monkeypatch.setattr(
        security.conf.settings,
        "FIRST_SUPERUSER_PASSWORD",
        "MissingDigitPassword",
    )
    monkeypatch.setattr(
        security,
        "get_user_by_email",
        AsyncMock(return_value=existing_superuser),
    )
    monkeypatch.setattr(security, "create_user", create_user)

    await security.create_default_superuser()

    create_user.assert_not_awaited()


async def test_create_default_superuser_raises_actionable_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    create_user = AsyncMock()

    monkeypatch.setattr(
        security.conf.settings,
        "FIRST_SUPERUSER_PASSWORD",
        "MissingDigitPassword",
    )
    monkeypatch.setattr(
        security,
        "get_user_by_email",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(security, "create_user", create_user)

    with pytest.raises(RuntimeError, match="FIRST_SUPERUSER_PASSWORD") as exc_info:
        await security.create_default_superuser()

    create_user.assert_not_awaited()
    assert "one digit" in str(exc_info.value)
    assert "backend/.env" in str(exc_info.value)
