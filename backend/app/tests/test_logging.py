"""
Tests for structured JSON logging and correlation ID middleware.
"""

import json
import logging

import pytest
from httpx import ASGITransport, AsyncClient

from app.core import conf
from app.core.correlation_id import (
    REQUEST_ID_HEADER,
    correlation_id,
)
from app.logging import StructuredJSONFormatter
from app.main import app

pytestmark = pytest.mark.asyncio(loop_scope="module")


# ---------------------------------------------------------------------------
# CorrelationIdMiddleware
# ---------------------------------------------------------------------------


async def test_response_contains_x_request_id_header():
    """Every HTTP response must carry the X-Request-ID header."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        resp = await client.get("/")
        assert REQUEST_ID_HEADER.lower() in {
            k.lower() for k in resp.headers.keys()
        }, f"Missing {REQUEST_ID_HEADER} header in response"


async def test_correlation_id_is_hex_uuid():
    """The correlation ID should be a 32-char hex string (uuid4 without hyphens)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        resp = await client.get("/")
        request_id = resp.headers.get(REQUEST_ID_HEADER.lower(), "")
        assert len(request_id) == 32
        assert all(c in "0123456789abcdef" for c in request_id)


async def test_each_request_gets_unique_id():
    """Two sequential requests should receive different correlation IDs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        ids = set()
        for _ in range(3):
            resp = await client.get("/")
            ids.add(resp.headers[REQUEST_ID_HEADER.lower()])
        assert len(ids) == 3, "Expected three unique request IDs"


# ---------------------------------------------------------------------------
# StructuredJSONFormatter
# ---------------------------------------------------------------------------


def test_structured_json_formatter_produces_valid_json():
    """StructuredJSONFormatter output must be parseable JSON with required keys."""
    formatter = StructuredJSONFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg="hello %s",
        args=("world",),
        exc_info=None,
    )
    output = formatter.format(record)
    parsed = json.loads(output)

    assert parsed["level"] == "INFO"
    assert parsed["message"] == "hello world"
    assert parsed["logger"] == "test_logger"
    assert "timestamp" in parsed
    assert "correlation_id" in parsed
    assert "process_id" in parsed
    assert "thread_id" in parsed


def test_structured_json_formatter_includes_exception():
    """When exc_info is set the formatter should include an exception key."""
    formatter = StructuredJSONFormatter()
    try:
        raise ValueError("boom")
    except ValueError:
        record = logging.LogRecord(
            name="test_logger",
            level=logging.ERROR,
            pathname="",
            lineno=0,
            msg="failure",
            args=(),
            exc_info=True,
        )
        # LogRecord with exc_info=True captures sys.exc_info() automatically
        import sys

        record.exc_info = sys.exc_info()

    output = formatter.format(record)
    parsed = json.loads(output)
    assert "exception" in parsed
    assert "ValueError" in parsed["exception"]


def test_structured_json_formatter_captures_correlation_id():
    """The formatter should pick up the active correlation_id from context."""
    token = correlation_id.set("test-request-abc123")
    try:
        formatter = StructuredJSONFormatter()
        record = logging.LogRecord(
            name="ctx",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="with context",
            args=(),
            exc_info=None,
        )
        parsed = json.loads(formatter.format(record))
        assert parsed["correlation_id"] == "test-request-abc123"
    finally:
        correlation_id.reset(token)
