"""
Rate-limit configuration for the Baldin API.

Tiers
-----
Global default  – 200/minute per IP (applied automatically to every endpoint).
Strict          – Auth-sensitive endpoints: 10/minute (login, MFA verify),
                  5/minute (register, password reset, email verification, and
                  related public fastapi-users auth surfaces).
Moderate        – Expensive operations: 5/minute (extractor run/suggest),
                  10/minute (crawler pipeline create), 3/minute (crawler trigger).
Relaxed         – Standard CRUD endpoints rely on the global default only.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
)
rate_limit_exceeded_handler = _rate_limit_exceeded_handler
