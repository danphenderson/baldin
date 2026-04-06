# Path: app/core/correlation_id.py

"""
Request correlation ID middleware.

Generates a unique ID per request and makes it available throughout the
request lifecycle via a ``contextvars.ContextVar``.  The ID is also
returned to the caller in the ``X-Request-ID`` response header so that
operators and consumers can correlate client-side observations with
server-side log entries.
"""

import uuid
from contextvars import ContextVar

from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = "X-Request-ID"

correlation_id: ContextVar[str] = ContextVar("correlation_id", default="")


class CorrelationIdMiddleware:
    """Pure-ASGI middleware that sets a per-request correlation ID."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        request_id = uuid.uuid4().hex
        token = correlation_id.set(request_id)

        async def send_with_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append(
                    (REQUEST_ID_HEADER.lower().encode(), request_id.encode())
                )
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        finally:
            correlation_id.reset(token)
