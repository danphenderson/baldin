"""WebSocket endpoint for real-time collaborative document editing."""

import uuid
from typing import Optional

from fastapi import APIRouter, Query, WebSocket
from fastapi_users.jwt import decode_jwt
from sqlalchemy import select

from app.api.deps import schemas
from app.core.db import async_session_maker
from app.core.document_collaboration import (
    DocumentCollaborationBootstrapClaimStatus,
    FastAPIWebsocketAdapter,
    claim_document_collaboration_bootstrap,
    document_collaboration_server,
    ensure_document_collaboration_server_started,
)
from app.core.security import get_jwt_strategy
from app.models import Document, DocumentShare, User

router: APIRouter = APIRouter()


def _connect_bootstrap_response() -> schemas.DocumentCollaborationBootstrapRead:
    return schemas.DocumentCollaborationBootstrapRead(
        status=schemas.DocumentCollaborationBootstrapStatus.CONNECT,
    )


# ---------------------------------------------------------------------------
#  Auth helper
# ---------------------------------------------------------------------------


async def _authenticate_ws(token: str) -> Optional[User]:
    """Decode a JWT bearer token and return the User or None."""
    strategy = get_jwt_strategy()
    try:
        data = decode_jwt(
            token,
            strategy.decode_key,
            strategy.token_audience,
            algorithms=[strategy.algorithm],
        )
        user_id_str = data.get("sub")
    except Exception:
        return None

    if not user_id_str:
        return None

    try:
        user_id = uuid.UUID(user_id_str)
    except (ValueError, AttributeError):
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


# ---------------------------------------------------------------------------
#  WebSocket endpoint
# ---------------------------------------------------------------------------


@router.post(
    "/{document_id}/collaborate/bootstrap",
    response_model=schemas.DocumentCollaborationBootstrapRead,
)
async def request_collaboration_bootstrap(
    document_id: str,
    token: str = Query(...),
) -> schemas.DocumentCollaborationBootstrapRead:
    user = await _authenticate_ws(token)
    if user is None:
        return _connect_bootstrap_response()

    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        return _connect_bootstrap_response()

    document = await _check_editor_access(user, doc_uuid)
    if document is None:
        return _connect_bootstrap_response()

    bootstrap = await claim_document_collaboration_bootstrap(document_id)
    if bootstrap.status is DocumentCollaborationBootstrapClaimStatus.SEED:
        return schemas.DocumentCollaborationBootstrapRead(
            status=schemas.DocumentCollaborationBootstrapStatus.SEED,
            content=bootstrap.content,
            content_format=schemas.ContentFormat.TIPTAP_JSON,
        )

    if bootstrap.status is DocumentCollaborationBootstrapClaimStatus.PENDING:
        return schemas.DocumentCollaborationBootstrapRead(
            status=schemas.DocumentCollaborationBootstrapStatus.PENDING,
            retry_after_ms=bootstrap.retry_after_ms,
        )

    return _connect_bootstrap_response()


@router.websocket("/{document_id}/collaborate")
async def collaborate(
    websocket: WebSocket,
    document_id: str,
    token: str = Query(...),
) -> None:
    user = await _authenticate_ws(token)
    if user is None:
        await websocket.close(code=4003, reason="Unauthorized")
        return

    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        await websocket.close(code=4004, reason="Invalid document ID")
        return

    document = await _check_editor_access(user, doc_uuid)
    if document is None:
        await websocket.close(code=4004, reason="Document not found or access denied")
        return

    await ensure_document_collaboration_server_started()
    await websocket.accept()
    try:
        await document_collaboration_server.serve(
            FastAPIWebsocketAdapter(websocket, document_id)
        )
    except Exception:
        await websocket.close()
