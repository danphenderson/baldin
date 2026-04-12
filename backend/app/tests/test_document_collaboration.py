"""Focused collaboration persistence tests for document hardening."""

import asyncio
import json
from contextlib import asynccontextmanager
from uuid import UUID

import pytest
import y_py as Y
from fastapi.testclient import TestClient
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from starlette.websockets import WebSocketDisconnect

from app import models
from app.api.routes.collaboration import COLLABORATION_WEBSOCKET_PROTOCOL
from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.core.document_collaboration import (
    DocumentCollaborationBootstrapClaimStatus,
    DocumentYStore,
    _document_bootstrap_claims,
    claim_document_collaboration_bootstrap,
    stop_document_collaboration_server,
)
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False


async def _ensure_db_ready() -> None:
    global _db_ready
    if _db_ready:
        return

    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    app.state.bootstrap_completed = True
    _db_ready = True


@asynccontextmanager
async def _client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


async def _create_user(password: str, **fields) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
        )
        for field, value in fields.items():
            setattr(user, field, value)
        await session.commit()
    return email, user.id


async def _auth_headers(
    client: AsyncClient,
    email: str,
    password: str,
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _request_collaboration_token(
    client: AsyncClient,
    document_id: UUID,
    headers: dict[str, str],
) -> str:
    response = await client.post(
        f"/api/v1/documents/{document_id}/collaborate/bootstrap",
        headers=headers,
    )
    assert response.status_code == 200
    collaboration_token = response.json()["collaboration_token"]
    assert collaboration_token
    return collaboration_token


async def _read_document_state(document_id: UUID) -> bytes | None:
    async with session_context() as session:
        document = await session.get(models.Document, document_id)
        if document is None or document.yjs_state is None:
            return None
        return bytes(document.yjs_state)


async def _wait_for_document_state(document_id: UUID) -> bytes | None:
    for _ in range(20):
        state = await _read_document_state(document_id)
        if state is not None:
            return state
        await asyncio.sleep(0.05)
    return None


async def _create_document(user_id: UUID) -> UUID:
    async with session_context() as session:
        document = models.Document(
            user_id=user_id,
            kind="freeform",
            title="Collaboration Doc",
        )
        session.add(document)
        await session.commit()
        return document.id


async def _create_versioned_document(
    user_id: UUID,
    *,
    content: str | None,
    content_format: str,
    kind: str = "freeform",
    block_snapshot: list[dict[str, object]] | None = None,
) -> UUID:
    async with session_context() as session:
        document = models.Document(
            user_id=user_id,
            kind=kind,
            title="Collaboration Doc",
        )
        session.add(document)
        await session.flush()

        version = models.DocumentVersion(
            document_id=document.id,
            version_number=1,
            name="v1",
            content=content,
            content_type="custom",
            content_format=content_format,
            block_snapshot=block_snapshot,
        )
        session.add(version)
        await session.flush()

        document.head_version_id = version.id
        await session.commit()
        return document.id


async def test_collaboration_persists_authoritative_yjs_state() -> None:
    await _ensure_db_ready()
    _, owner_id = await _create_user(
        "collab-owner-pass",
        first_name="Cora",
        last_name="Owner",
    )
    document_id = await _create_document(owner_id)

    ydoc = Y.YDoc()
    text = ydoc.get_text("default")
    with ydoc.begin_transaction() as txn:
        text.extend(txn, "Hello")
    update_one = Y.encode_state_as_update(ydoc)
    state_after_first = Y.encode_state_vector(ydoc)
    with ydoc.begin_transaction() as txn:
        text.extend(txn, " world")
    update_two = Y.encode_state_as_update(ydoc, state_after_first)

    store = DocumentYStore(str(document_id))
    await store.write(update_one)
    await store.write(update_two)

    persisted_state = await _wait_for_document_state(document_id)

    assert persisted_state is not None

    recovered = Y.YDoc()
    Y.apply_update(recovered, persisted_state)
    assert str(recovered.get_text("default")) == "Hello world"


async def test_collaboration_bootstrap_claims_rich_text_seed_then_waits_until_retry() -> (
    None
):
    await _ensure_db_ready()
    rich_content = json.dumps(
        {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Seed me once"}],
                }
            ],
        }
    )

    async with _client() as client:
        owner_email, owner_id = await _create_user(
            "collab-bootstrap-pass",
            first_name="Bri",
            last_name="Bootstrap",
        )
        headers = await _auth_headers(client, owner_email, "collab-bootstrap-pass")
        document_id = await _create_versioned_document(
            owner_id,
            content=rich_content,
            content_format="tiptap_json",
        )

        first_response = await client.post(
            f"/api/v1/documents/{document_id}/collaborate/bootstrap",
            headers=headers,
        )
        second_response = await client.post(
            f"/api/v1/documents/{document_id}/collaborate/bootstrap",
            headers=headers,
        )
        _document_bootstrap_claims[str(document_id)] = 0.0
        third_response = await client.post(
            f"/api/v1/documents/{document_id}/collaborate/bootstrap",
            headers=headers,
        )

    assert first_response.status_code == 200
    first_payload = first_response.json()
    assert first_payload["status"] == "seed"
    assert first_payload["retry_after_ms"] is None
    assert first_payload["content"] == rich_content
    assert first_payload["content_format"] == "tiptap_json"
    assert first_payload["collaboration_token"]
    assert second_response.status_code == 200
    second_payload = second_response.json()
    assert second_payload["status"] == "pending"
    assert second_payload["collaboration_token"]
    assert second_payload["content"] is None
    assert second_payload["content_format"] is None
    assert 100 <= second_payload["retry_after_ms"] <= 1000
    assert third_response.status_code == 200
    third_payload = third_response.json()
    assert third_payload["status"] == "seed"
    assert third_payload["retry_after_ms"] is None
    assert third_payload["content"] == rich_content
    assert third_payload["content_format"] == "tiptap_json"
    assert third_payload["collaboration_token"]


async def test_collaboration_bootstrap_rebuilds_cell_doc_seed_from_block_snapshot() -> (
    None
):
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, owner_id = await _create_user(
            "collab-snapshot-pass",
            first_name="Bela",
            last_name="Snapshot",
        )
        headers = await _auth_headers(client, owner_email, "collab-snapshot-pass")
        document_id = await _create_versioned_document(
            owner_id,
            kind="cell_doc",
            content=json.dumps({"type": "doc", "content": [{"type": "paragraph"}]}),
            content_format="tiptap_json",
            block_snapshot=[
                {
                    "id": "00000000-0000-4000-8000-000000000111",
                    "block_type": "paragraph",
                    "content": [{"type": "text", "text": "Snapshot seed"}],
                    "properties": {},
                    "position": 0,
                    "children": [],
                }
            ],
        )

        response = await client.post(
            f"/api/v1/documents/{document_id}/collaborate/bootstrap",
            headers=headers,
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "seed"
    assert payload["content_format"] == "tiptap_json"
    assert json.loads(payload["content"]) == {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "attrs": {"blockId": "00000000-0000-4000-8000-000000000111"},
                "content": [{"type": "text", "text": "Snapshot seed"}],
            }
        ],
    }


async def test_collaboration_bootstrap_skips_invalid_or_plain_text_content() -> None:
    await _ensure_db_ready()
    _, owner_id = await _create_user(
        "collab-skip-pass",
        first_name="Skye",
        last_name="Skip",
    )

    invalid_rich_document_id = await _create_versioned_document(
        owner_id,
        content='{"type":"doc"',
        content_format="tiptap_json",
    )
    plain_text_document_id = await _create_versioned_document(
        owner_id,
        content="Plain text stays non-collaborative",
        content_format="plain_text",
    )

    invalid_result = await claim_document_collaboration_bootstrap(
        str(invalid_rich_document_id)
    )
    plain_text_result = await claim_document_collaboration_bootstrap(
        str(plain_text_document_id)
    )

    assert invalid_result.status is DocumentCollaborationBootstrapClaimStatus.CONNECT
    assert invalid_result.content is None
    assert invalid_result.retry_after_ms is None
    assert plain_text_result.status is DocumentCollaborationBootstrapClaimStatus.CONNECT
    assert plain_text_result.content is None
    assert plain_text_result.retry_after_ms is None


async def test_collaboration_websocket_reads_bootstrap_token_from_subprotocol() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, owner_id = await _create_user(
            "collab-ws-pass",
            first_name="Wes",
            last_name="Socket",
        )
        headers = await _auth_headers(client, owner_email, "collab-ws-pass")
        document_id = await _create_document(owner_id)
        collaboration_token = await _request_collaboration_token(
            client,
            document_id,
            headers,
        )

    try:
        with TestClient(app) as client:
            with client.websocket_connect(
                f"/api/v1/documents/{document_id}/collaborate",
                subprotocols=[
                    COLLABORATION_WEBSOCKET_PROTOCOL,
                    collaboration_token,
                ],
            ) as websocket:
                assert (
                    websocket.accepted_subprotocol == COLLABORATION_WEBSOCKET_PROTOCOL
                )
    finally:
        await stop_document_collaboration_server()


async def test_collaboration_websocket_rejects_missing_subprotocol_token() -> None:
    await _ensure_db_ready()
    _, owner_id = await _create_user(
        "collab-ws-missing-pass",
        first_name="Mina",
        last_name="Token",
    )
    document_id = await _create_document(owner_id)

    try:
        with TestClient(app) as client:
            with pytest.raises(WebSocketDisconnect) as exc_info:
                with client.websocket_connect(
                    f"/api/v1/documents/{document_id}/collaborate",
                    subprotocols=[COLLABORATION_WEBSOCKET_PROTOCOL],
                ):
                    pass
    finally:
        await stop_document_collaboration_server()

    assert exc_info.value.code == 4003
    assert exc_info.value.reason == "Unauthorized"


async def test_collaboration_bootstrap_yjs_state_remains_authoritative() -> None:
    await _ensure_db_ready()
    rich_content = json.dumps(
        {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Seed me once"}],
                }
            ],
        }
    )
    _, owner_id = await _create_user(
        "collab-authoritative-pass",
        first_name="Ari",
        last_name="Authoritative",
    )
    document_id = await _create_versioned_document(
        owner_id,
        content=rich_content,
        content_format="tiptap_json",
    )

    initial_claim = await claim_document_collaboration_bootstrap(str(document_id))
    assert initial_claim.status is DocumentCollaborationBootstrapClaimStatus.SEED
    assert initial_claim.content == rich_content

    ydoc = Y.YDoc()
    text = ydoc.get_text("default")
    with ydoc.begin_transaction() as txn:
        text.extend(txn, "Room state wins")
    update = Y.encode_state_as_update(ydoc)

    store = DocumentYStore(str(document_id))
    await store.write(update)

    final_claim = await claim_document_collaboration_bootstrap(str(document_id))
    assert final_claim.status is DocumentCollaborationBootstrapClaimStatus.CONNECT
    assert final_claim.content is None
    assert final_claim.retry_after_ms is None

    persisted_state = await _wait_for_document_state(document_id)
    assert persisted_state is not None

    recovered = Y.YDoc()
    Y.apply_update(recovered, persisted_state)
    assert str(recovered.get_text("default")) == "Room state wins"
