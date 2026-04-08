"""WebSocket endpoint for real-time collaborative document editing."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, WebSocket
from sqlalchemy import select

from app.api.deps import schemas
from app.core import conf
from app.core.db import async_session_maker
from app.core.document_collaboration import (
    DocumentCollaborationBootstrapClaimStatus,
    FastAPIWebsocketAdapter,
    claim_document_collaboration_bootstrap,
    document_collaboration_server,
    ensure_document_collaboration_server_started,
)
from app.core.security import get_current_user
from app.models import Document, DocumentShare, User

router: APIRouter = APIRouter()
COLLABORATION_TOKEN_AUDIENCE = "document-collaboration"
COLLABORATION_WEBSOCKET_PROTOCOL = "baldin-collaboration"
# Keep collaboration session keys short-lived to limit exposure if handshake
# metadata is logged while still allowing brief reconnect windows during editor
# bootstrap.
COLLABORATION_TOKEN_EXPIRE_MINUTES = 5


def _connect_bootstrap_response() -> schemas.DocumentCollaborationBootstrapRead:
    return schemas.DocumentCollaborationBootstrapRead(
        status=schemas.DocumentCollaborationBootstrapStatus.CONNECT,
    )


# ---------------------------------------------------------------------------
#  Auth helper
# ---------------------------------------------------------------------------


def _create_collaboration_token(user_id: uuid.UUID, document_id: uuid.UUID) -> str:
    payload = {
        "sub": str(user_id),
        "doc": str(document_id),
        "aud": COLLABORATION_TOKEN_AUDIENCE,
        "exp": datetime.now(timezone.utc)
        + timedelta(minutes=COLLABORATION_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, conf.settings.SECRET_KEY, algorithm="HS256")


async def _authenticate_collaboration_session(
    token: str,
    document_id: uuid.UUID,
) -> Optional[User]:
    try:
        data = jwt.decode(
            token,
            conf.settings.SECRET_KEY,
            algorithms=["HS256"],
            audience=COLLABORATION_TOKEN_AUDIENCE,
        )
        if data.get("doc") != str(document_id):
            return None
        user_id = uuid.UUID(data["sub"])
    except Exception:
        return None

    async with async_session_maker() as session:
        user = await session.get(User, user_id)
        if user is None or not user.is_active:  # type: ignore[attr-defined]
            return None
        return user


async def _check_editor_access(
    user: User, document_id: uuid.UUID
) -> Optional[Document]:
    """Return the Document if the user is owner or has editor share, else None."""
    async with async_session_maker() as session:
        document = await session.get(Document, document_id)
        if document is None:
            return None

        # Owner always has access
        if document.user_id == user.id:  # type: ignore[attr-defined]
            return document

        # Check for editor share
        result = await session.execute(
            select(DocumentShare).where(
                DocumentShare.document_id == document.id,
                DocumentShare.shared_with_user_id == user.id,  # type: ignore[attr-defined]
                DocumentShare.role == "editor",
            )
        )
        share = result.scalar_one_or_none()
        if share is not None:
            return document

        return None


def _get_requested_websocket_subprotocols(websocket: WebSocket) -> list[str]:
    subprotocols = websocket.scope.get("subprotocols")
    if isinstance(subprotocols, (list, tuple)):
        return [
            value.strip()
            for value in subprotocols
            if isinstance(value, str) and value.strip()
        ]

    requested_subprotocols = websocket.headers.get("sec-websocket-protocol", "")
    return [
        value.strip() for value in requested_subprotocols.split(",") if value.strip()
    ]


def _extract_collaboration_token_from_websocket(
    websocket: WebSocket,
) -> Optional[str]:
    subprotocols = _get_requested_websocket_subprotocols(websocket)
    if len(subprotocols) < 2:
        return None
    if subprotocols[0] != COLLABORATION_WEBSOCKET_PROTOCOL:
        return None
    return subprotocols[1]


# ---------------------------------------------------------------------------
#  WebSocket endpoint
# ---------------------------------------------------------------------------


@router.post(
    "/{document_id}/collaborate/bootstrap",
    response_model=schemas.DocumentCollaborationBootstrapRead,
)
async def request_collaboration_bootstrap(
    document_id: str,
    current_user: User = Depends(get_current_user),
) -> schemas.DocumentCollaborationBootstrapRead:
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        return _connect_bootstrap_response()

    document = await _check_editor_access(current_user, doc_uuid)
    if document is None:
        return _connect_bootstrap_response()

    collaboration_token = _create_collaboration_token(current_user.id, doc_uuid)

    bootstrap = await claim_document_collaboration_bootstrap(document_id)
    if bootstrap.status is DocumentCollaborationBootstrapClaimStatus.SEED:
        return schemas.DocumentCollaborationBootstrapRead(
            status=schemas.DocumentCollaborationBootstrapStatus.SEED,
            content=bootstrap.content,
            content_format=schemas.ContentFormat.TIPTAP_JSON,
            collaboration_token=collaboration_token,
        )

    if bootstrap.status is DocumentCollaborationBootstrapClaimStatus.PENDING:
        return schemas.DocumentCollaborationBootstrapRead(
            status=schemas.DocumentCollaborationBootstrapStatus.PENDING,
            retry_after_ms=bootstrap.retry_after_ms,
            collaboration_token=collaboration_token,
        )

    return schemas.DocumentCollaborationBootstrapRead(
        status=schemas.DocumentCollaborationBootstrapStatus.CONNECT,
        collaboration_token=collaboration_token,
    )


@router.websocket("/{document_id}/collaborate")
async def collaborate(
    websocket: WebSocket,
    document_id: str,
) -> None:
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        await websocket.close(code=4004, reason="Invalid document ID")
        return

    collaboration_token = _extract_collaboration_token_from_websocket(websocket)
    if collaboration_token is None:
        await websocket.close(code=4003, reason="Unauthorized")
        return

    user = await _authenticate_collaboration_session(collaboration_token, doc_uuid)
    if user is None:
        await websocket.close(code=4003, reason="Unauthorized")
        return

    document = await _check_editor_access(user, doc_uuid)
    if document is None:
        await websocket.close(code=4004, reason="Document not found or access denied")
        return

    await ensure_document_collaboration_server_started()
    await websocket.accept(subprotocol=COLLABORATION_WEBSOCKET_PROTOCOL)
    try:
        await document_collaboration_server.serve(
            FastAPIWebsocketAdapter(websocket, document_id)
        )
    except Exception:
        await websocket.close()
