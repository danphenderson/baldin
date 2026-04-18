"""Focused backend tests for document sharing, activity, and upload hardening."""

import json
from io import BytesIO
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from reportlab.pdfgen import canvas
from sqlalchemy import select

from app import models
from app.conftest import (
    async_client_ctx,
    login_and_get_headers,
)
from app.conftest import (
    create_user as _shared_create_user,
)
from app.core.db import session_context
from app.core.document_storage import resolve_document_source_path
from app.tests import utils


@pytest.fixture(scope="module", autouse=True)
async def _shared_db_ready(ensure_db: None) -> None:
    del ensure_db


async def _ensure_db_ready() -> None:
    return None


async def _create_user(
    password: str,
    *,
    is_superuser: bool = False,
    **fields,
) -> tuple[str, UUID]:
    email, user_id = await _shared_create_user(
        password,
        is_superuser=is_superuser,
    )
    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        for field, value in fields.items():
            setattr(user, field, value)
        await session.commit()
    return email, user_id


async def _auth_headers(
    client: AsyncClient,
    email: str,
    password: str,
) -> dict[str, str]:
    return await login_and_get_headers(client, email, password)


_client = async_client_ctx


async def _create_document(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    title: str,
    content: str | None = "Base draft",
    kind: str = "freeform",
    content_format: str = "plain_text",
) -> dict:
    payload: dict[str, object] = {
        "kind": kind,
        "title": title,
        "content_format": content_format,
    }
    if content is not None:
        payload["content"] = content

    response = await client.post(
        "/api/v1/documents/",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


def _build_pdf_bytes(text: str) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 720, text)
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.read()


def _inline_text(text: str) -> list[dict[str, str]]:
    return [{"type": "text", "text": text}]


def _paragraph_node(text: str) -> dict[str, object]:
    return {"type": "paragraph", "content": _inline_text(text)}


def _heading_node(text: str, *, level: int = 2) -> dict[str, object]:
    return {
        "type": "heading",
        "attrs": {"level": level},
        "content": _inline_text(text),
    }


def _details_node(
    summary: str,
    *children: dict[str, object],
) -> dict[str, object]:
    details_content: dict[str, object] = {"type": "detailsContent"}
    if children:
        details_content["content"] = list(children)
    return {
        "type": "details",
        "content": [
            {"type": "detailsSummary", "content": _inline_text(summary)},
            details_content,
        ],
    }


def _cell_doc_content(*nodes: dict[str, object]) -> str:
    return json.dumps({"type": "doc", "content": list(nodes)})


def _block_tree_signature(items: list[dict]) -> list[dict]:
    return [
        {
            "id": item["id"],
            "block_type": item["block_type"],
            "content": item.get("content"),
            "properties": item.get("properties") or {},
            "position": item["position"],
            "children": _block_tree_signature(item.get("children") or []),
        }
        for item in items
    ]


@pytest.mark.asyncio(loop_scope="module")
async def test_share_candidates_use_authenticated_sharing_contract() -> None:
    await _ensure_db_ready()
    unique = utils.random_lower_string(8)

    async with _client() as client:
        owner_email, owner_id = await _create_user(
            "share-owner-pass",
            first_name="Owner",
            last_name="User",
            headline="Hiring manager",
        )
        existing_email, existing_id = await _create_user(
            "share-existing-pass",
            first_name="Existing",
            last_name="Member",
        )
        hidden_email, hidden_id = await _create_user(
            "share-hidden-pass",
            first_name=f"Hidden{unique}",
            last_name="Collaborator",
            headline="Private but shareable",
            is_discoverable=False,
        )
        _, inactive_id = await _create_user(
            "share-inactive-pass",
            first_name=f"Hidden{unique}",
            last_name="Inactive",
            is_active=False,
        )

        owner_headers = await _auth_headers(client, owner_email, "share-owner-pass")
        doc = await _create_document(client, owner_headers, title="Share Lookup Doc")
        document_id = doc["id"]

        share_response = await client.post(
            f"/api/v1/documents/{document_id}/shares",
            json={"shared_with_user_id": str(existing_id), "role": "viewer"},
            headers=owner_headers,
        )
        assert share_response.status_code == 201, share_response.text

        response = await client.get(
            f"/api/v1/documents/{document_id}/share-candidates",
            params={"q": f"Hidden{unique}", "limit": 10},
            headers=owner_headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(hidden_id)
    assert body[0]["full_name"] == f"Hidden{unique} Collaborator"
    assert body[0]["email"] == hidden_email
    assert body[0]["headline"] == "Private but shareable"
    assert str(owner_id) not in {item["id"] for item in body}
    assert str(existing_id) not in {item["id"] for item in body}
    assert str(inactive_id) not in {item["id"] for item in body}


@pytest.mark.asyncio(loop_scope="module")
async def test_share_contracts_include_metadata_for_owner_and_shared_views() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, owner_id = await _create_user(
            "share-meta-owner-pass",
            first_name="Sharon",
            last_name="Owner",
        )
        viewer_email, viewer_id = await _create_user(
            "share-meta-view-pass",
            first_name="Victor",
            last_name="Viewer",
            headline="Editor and reviewer",
        )

        owner_headers = await _auth_headers(
            client, owner_email, "share-meta-owner-pass"
        )
        viewer_headers = await _auth_headers(
            client, viewer_email, "share-meta-view-pass"
        )
        doc = await _create_document(client, owner_headers, title="Shared Metadata Doc")
        document_id = doc["id"]

        create_share = await client.post(
            f"/api/v1/documents/{document_id}/shares",
            json={"shared_with_user_id": str(viewer_id), "role": "editor"},
            headers=owner_headers,
        )
        assert create_share.status_code == 201, create_share.text

        shares_response = await client.get(
            f"/api/v1/documents/{document_id}/shares",
            headers=owner_headers,
        )
        detail_response = await client.get(
            f"/api/v1/documents/{document_id}",
            headers=viewer_headers,
        )
        shared_with_me_response = await client.get(
            "/api/v1/documents/shared-with-me",
            headers=viewer_headers,
        )

    assert shares_response.status_code == 200
    shares = shares_response.json()
    assert len(shares) == 1
    share = shares[0]
    assert share["shared_with_user_id"] == str(viewer_id)
    assert share["shared_with_full_name"] == "Victor Viewer"
    assert share["shared_with_email"] == viewer_email
    assert share["shared_by_user_id"] == str(owner_id)
    assert share["shared_by_full_name"] == "Sharon Owner"
    assert share["shared_by_email"] == owner_email
    assert share["role"] == "editor"
    assert share["created_at"]
    assert share["updated_at"]

    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["viewer_role"] == "editor"
    assert detail["owner_user_id"] == str(owner_id)
    assert detail["owner_full_name"] == "Sharon Owner"
    assert detail["owner_email"] == owner_email
    assert detail["shared_by_user_id"] == str(owner_id)
    assert detail["shared_by_full_name"] == "Sharon Owner"
    assert detail["shared_by_email"] == owner_email

    assert shared_with_me_response.status_code == 200
    shared_docs = shared_with_me_response.json()
    assert len(shared_docs) >= 1
    shared_doc = next(item for item in shared_docs if item["id"] == document_id)
    assert shared_doc["viewer_role"] == "editor"
    assert shared_doc["owner_user_id"] == str(owner_id)
    assert shared_doc["owner_full_name"] == "Sharon Owner"
    assert shared_doc["owner_email"] == owner_email
    assert shared_doc["shared_by_user_id"] == str(owner_id)
    assert shared_doc["shared_by_full_name"] == "Sharon Owner"
    assert shared_doc["shared_by_email"] == owner_email
    assert shared_doc["shared_at"]
    assert shared_doc["share_updated_at"]


@pytest.mark.asyncio(loop_scope="module")
async def test_document_activity_tracks_history_events() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "activity-owner-pass",
            first_name="Ariel",
            last_name="Archivist",
        )
        collaborator_email, collaborator_id = await _create_user(
            "activity-collab-pass",
            first_name="Erin",
            last_name="Editor",
        )

        owner_headers = await _auth_headers(client, owner_email, "activity-owner-pass")
        doc = await _create_document(
            client, owner_headers, title="Activity Timeline Doc"
        )
        document_id = doc["id"]

        create_version = await client.post(
            f"/api/v1/documents/{document_id}/versions",
            json={
                "name": "v2",
                "content": "Updated body",
                "content_format": "plain_text",
                "change_summary": "Expanded content",
            },
            headers=owner_headers,
        )
        assert create_version.status_code == 201, create_version.text

        create_share = await client.post(
            f"/api/v1/documents/{document_id}/shares",
            json={"shared_with_user_id": str(collaborator_id), "role": "viewer"},
            headers=owner_headers,
        )
        assert create_share.status_code == 201, create_share.text
        share_id = create_share.json()["id"]

        update_share = await client.patch(
            f"/api/v1/documents/{document_id}/shares/{share_id}",
            json={"role": "editor"},
            headers=owner_headers,
        )
        assert update_share.status_code == 200, update_share.text

        delete_share = await client.delete(
            f"/api/v1/documents/{document_id}/shares/{share_id}",
            headers=owner_headers,
        )
        assert delete_share.status_code == 204, delete_share.text

        archive_response = await client.patch(
            f"/api/v1/documents/{document_id}",
            json={"status": "archived"},
            headers=owner_headers,
        )
        assert archive_response.status_code == 200, archive_response.text

        restore_response = await client.patch(
            f"/api/v1/documents/{document_id}",
            json={"status": "active"},
            headers=owner_headers,
        )
        assert restore_response.status_code == 200, restore_response.text

        pin_response = await client.post(
            f"/api/v1/documents/{document_id}/pin",
            json={"pinned": True},
            headers=owner_headers,
        )
        assert pin_response.status_code == 200, pin_response.text

        unpin_response = await client.post(
            f"/api/v1/documents/{document_id}/pin",
            json={"pinned": False},
            headers=owner_headers,
        )
        assert unpin_response.status_code == 200, unpin_response.text

        activity_response = await client.get(
            f"/api/v1/documents/{document_id}/activity",
            headers=owner_headers,
        )

    assert activity_response.status_code == 200
    activity = activity_response.json()
    activity_types = {item["activity_type"] for item in activity}
    assert "document_created" in activity_types
    assert "version_saved" in activity_types
    assert "share_created" in activity_types
    assert "share_updated" in activity_types
    assert "share_revoked" in activity_types
    assert "document_archived" in activity_types
    assert "document_unarchived" in activity_types
    assert "document_pinned" in activity_types
    assert "document_unpinned" in activity_types


@pytest.mark.asyncio(loop_scope="module")
async def test_cell_doc_create_initializes_default_block_and_seed_content() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "cell-doc-owner-pass",
            first_name="Casey",
            last_name="Blocks",
        )
        owner_headers = await _auth_headers(client, owner_email, "cell-doc-owner-pass")

        response = await client.post(
            "/api/v1/documents/",
            json={
                "kind": "cell_doc",
                "title": "Cell Doc Draft",
            },
            headers=owner_headers,
        )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["kind"] == "cell_doc"
    assert body["head_version"]["content_format"] == "tiptap_json"

    async with session_context() as session:
        result = await session.execute(
            select(models.DocumentBlock)
            .where(models.DocumentBlock.document_id == body["id"])
            .order_by(models.DocumentBlock.position)
        )
        blocks = result.scalars().all()

    assert len(blocks) == 1
    block = blocks[0]
    assert block.parent_block_id is None
    assert block.block_type == "paragraph"
    assert block.content == []
    assert block.properties == {}
    assert block.position == 0
    assert json.loads(body["head_version"]["content"]) == {
        "type": "doc",
        "content": [{"type": "paragraph", "attrs": {"blockId": str(block.id)}}],
    }
    assert body["versions"][0]["block_snapshot"] == [
        {
            "id": str(block.id),
            "block_type": "paragraph",
            "content": [],
            "properties": {},
            "position": 0,
            "children": [],
        }
    ]


@pytest.mark.asyncio(loop_scope="module")
async def test_cell_doc_version_save_persists_block_snapshot_and_live_blocks() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "cell-doc-version-owner-pass",
            first_name="Violet",
            last_name="Versioner",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "cell-doc-version-owner-pass"
        )
        doc = await _create_document(
            client,
            owner_headers,
            title="Cell Doc Version Save",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        initial_blocks_response = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert initial_blocks_response.status_code == 200, initial_blocks_response.text
        initial_block_id = initial_blocks_response.json()[0]["id"]

        save_response = await client.post(
            f"/api/v1/documents/{document_id}/versions",
            json={
                "name": "Structured v2",
                "content": _cell_doc_content(
                    _heading_node("Snapshot title"),
                    _paragraph_node("Version body"),
                ),
                "content_format": "tiptap_json",
                "change_summary": "Structured update",
            },
            headers=owner_headers,
        )
        assert save_response.status_code == 201, save_response.text
        saved_version = save_response.json()

        blocks_response = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert blocks_response.status_code == 200, blocks_response.text
        live_blocks = blocks_response.json()

        version_detail_response = await client.get(
            f"/api/v1/documents/{document_id}/versions/{saved_version['id']}",
            headers=owner_headers,
        )
        assert version_detail_response.status_code == 200, version_detail_response.text

    live_tree = _block_tree_signature(live_blocks)
    assert saved_version["content_format"] == "tiptap_json"
    assert _block_tree_signature(saved_version["block_snapshot"]) == live_tree
    assert saved_version["block_snapshot"][0]["id"] == initial_block_id
    assert saved_version["block_snapshot"][1]["id"] != initial_block_id
    saved_tiptap = json.loads(saved_version["content"])
    assert saved_tiptap["content"][0]["attrs"]["blockId"] == initial_block_id
    assert (
        saved_tiptap["content"][1]["attrs"]["blockId"]
        == saved_version["block_snapshot"][1]["id"]
    )
    assert (
        version_detail_response.json()["block_snapshot"]
        == saved_version["block_snapshot"]
    )

    async with session_context() as session:
        document = await session.get(models.Document, document_id)
        version = await session.get(models.DocumentVersion, UUID(saved_version["id"]))

    assert document is not None
    assert str(document.head_version_id) == saved_version["id"]
    assert version is not None
    assert _block_tree_signature(version.block_snapshot) == live_tree


@pytest.mark.asyncio(loop_scope="module")
async def test_cell_doc_version_save_preserves_wrapped_toggle_child_ids() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "cell-doc-toggle-version-owner-pass",
            first_name="Talia",
            last_name="Toggle",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "cell-doc-toggle-version-owner-pass"
        )
        doc = await _create_document(
            client,
            owner_headers,
            title="Cell Doc Toggle Version Save",
            kind="cell_doc",
            content=_cell_doc_content(
                _details_node(
                    "Expand context",
                    _paragraph_node("Hidden details"),
                )
            ),
            content_format="tiptap_json",
        )
        document_id = doc["id"]

        initial_blocks_response = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert initial_blocks_response.status_code == 200, initial_blocks_response.text
        initial_blocks = initial_blocks_response.json()
        assert initial_blocks[0]["block_type"] == "toggle"
        assert initial_blocks[0]["children"][0]["block_type"] == "paragraph"
        toggle_id = initial_blocks[0]["id"]
        child_id = initial_blocks[0]["children"][0]["id"]

        save_response = await client.post(
            f"/api/v1/documents/{document_id}/versions",
            json={
                "name": "Wrapped toggle v2",
                "content": _cell_doc_content(
                    _details_node(
                        "Expand context",
                        _paragraph_node("Updated hidden details"),
                    )
                ),
                "content_format": "tiptap_json",
                "change_summary": "Update wrapped toggle",
            },
            headers=owner_headers,
        )
        assert save_response.status_code == 201, save_response.text
        saved_version = save_response.json()

        blocks_response = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert blocks_response.status_code == 200, blocks_response.text
        live_blocks = blocks_response.json()

    assert live_blocks[0]["id"] == toggle_id
    assert live_blocks[0]["children"][0]["id"] == child_id
    assert saved_version["block_snapshot"][0]["id"] == toggle_id
    assert saved_version["block_snapshot"][0]["children"][0]["id"] == child_id


@pytest.mark.asyncio(loop_scope="module")
async def test_cell_doc_restore_uses_version_snapshot_and_clears_yjs_state() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "cell-doc-restore-owner-pass",
            first_name="Rory",
            last_name="Restorer",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "cell-doc-restore-owner-pass"
        )
        doc = await _create_document(
            client,
            owner_headers,
            title="Cell Doc Restore",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        saved_version_response = await client.post(
            f"/api/v1/documents/{document_id}/versions",
            json={
                "name": "Restore target",
                "content": _cell_doc_content(
                    _heading_node("Restore me"),
                    _paragraph_node("Recover this paragraph"),
                ),
                "content_format": "tiptap_json",
                "change_summary": "Add recoverable structure",
            },
            headers=owner_headers,
        )
        assert saved_version_response.status_code == 201, saved_version_response.text
        restore_target_version = saved_version_response.json()

        diverged_version_response = await client.post(
            f"/api/v1/documents/{document_id}/versions",
            json={
                "name": "Diverged v3",
                "content": _cell_doc_content(_paragraph_node("Temporary draft")),
                "content_format": "tiptap_json",
                "change_summary": "Collapse structure",
            },
            headers=owner_headers,
        )
        assert diverged_version_response.status_code == 201, (
            diverged_version_response.text
        )

        async with session_context() as session:
            document = await session.get(models.Document, document_id)
            assert document is not None
            document.yjs_state = b"stale-yjs-state"
            await session.commit()

        restore_response = await client.post(
            f"/api/v1/documents/{document_id}/versions",
            json={
                "content": restore_target_version["content"],
                "content_format": "tiptap_json",
                "change_summary": (
                    f"Restored from v{restore_target_version['version_number']}"
                ),
            },
            headers=owner_headers,
        )
        assert restore_response.status_code == 201, restore_response.text
        restored_version = restore_response.json()

        restored_blocks_response = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert restored_blocks_response.status_code == 200, (
            restored_blocks_response.text
        )

    expected_tree = _block_tree_signature(restore_target_version["block_snapshot"])
    restored_tree = _block_tree_signature(restored_blocks_response.json())
    assert restored_tree == expected_tree
    assert (
        restored_version["block_snapshot"] == restore_target_version["block_snapshot"]
    )

    async with session_context() as session:
        document = await session.get(models.Document, document_id)
        version = await session.get(
            models.DocumentVersion, UUID(restored_version["id"])
        )

    assert document is not None
    assert document.yjs_state is None
    assert str(document.head_version_id) == restored_version["id"]
    assert version is not None
    assert version.block_snapshot == restore_target_version["block_snapshot"]


@pytest.mark.asyncio(loop_scope="module")
async def test_flat_document_version_save_leaves_block_snapshot_empty() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "flat-version-owner-pass",
            first_name="Parker",
            last_name="Plaintext",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "flat-version-owner-pass"
        )
        doc = await _create_document(
            client,
            owner_headers,
            title="Plain Text Doc",
            content="Base draft",
        )
        document_id = doc["id"]

        response = await client.post(
            f"/api/v1/documents/{document_id}/versions",
            json={
                "name": "v2",
                "content": "Updated body",
                "content_format": "plain_text",
                "change_summary": "Plain text update",
            },
            headers=owner_headers,
        )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["block_snapshot"] is None

    async with session_context() as session:
        version = await session.get(models.DocumentVersion, UUID(body["id"]))

    assert version is not None
    assert version.block_snapshot is None


@pytest.mark.asyncio(loop_scope="module")
async def test_block_crud_routes_record_activity_and_nested_tree() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "block-crud-owner-pass",
            first_name="Blair",
            last_name="Writer",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "block-crud-owner-pass"
        )
        doc = await _create_document(
            client,
            owner_headers,
            title="Block CRUD Doc",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        initial_blocks = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert initial_blocks.status_code == 200, initial_blocks.text
        default_block_id = initial_blocks.json()[0]["id"]

        create_toggle = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={
                "block_type": "toggle",
                "properties": {"summary": "Highlights"},
                "position": 0,
            },
            headers=owner_headers,
        )
        assert create_toggle.status_code == 201, create_toggle.text
        toggle = create_toggle.json()
        toggle_id = toggle["id"]
        assert toggle["block_type"] == "toggle"
        assert toggle["position"] == 0

        after_toggle = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert after_toggle.status_code == 200, after_toggle.text
        after_toggle_tree = after_toggle.json()
        assert [block["block_type"] for block in after_toggle_tree] == [
            "toggle",
            "paragraph",
        ]
        assert after_toggle_tree[1]["id"] == default_block_id
        assert after_toggle_tree[1]["position"] == 1

        create_child = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={
                "parent_block_id": toggle_id,
                "block_type": "paragraph",
                "content": [{"type": "text", "text": "Nested block"}],
                "position": 0,
            },
            headers=owner_headers,
        )
        assert create_child.status_code == 201, create_child.text
        child_id = create_child.json()["id"]

        update_child = await client.patch(
            f"/api/v1/documents/{document_id}/blocks/{child_id}",
            json={
                "block_type": "heading",
                "content": [{"type": "text", "text": "Nested title"}],
                "properties": {"level": 2},
            },
            headers=owner_headers,
        )
        assert update_child.status_code == 200, update_child.text
        updated_child = update_child.json()
        assert updated_child["block_type"] == "heading"
        assert updated_child["properties"] == {"level": 2}

        delete_toggle = await client.delete(
            f"/api/v1/documents/{document_id}/blocks/{toggle_id}",
            headers=owner_headers,
        )
        assert delete_toggle.status_code == 204, delete_toggle.text

        final_blocks = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert final_blocks.status_code == 200, final_blocks.text

        activity_response = await client.get(
            f"/api/v1/documents/{document_id}/activity",
            headers=owner_headers,
        )

    assert final_blocks.json() == [
        {
            "id": default_block_id,
            "document_id": document_id,
            "parent_block_id": None,
            "block_type": "paragraph",
            "content": [],
            "properties": {},
            "position": 0,
            "children": [],
            "created_at": final_blocks.json()[0]["created_at"],
            "updated_at": final_blocks.json()[0]["updated_at"],
        }
    ]

    assert activity_response.status_code == 200
    activity = activity_response.json()

    block_create_activity = [
        item for item in activity if item["activity_type"] == "block_created"
    ]
    assert any(
        item["details"]["block_type"] == "toggle" and item["details"]["position"] == 0
        for item in block_create_activity
    )
    assert any(
        item["details"]["block_type"] == "paragraph"
        and item["details"]["parent_block_id"] == toggle_id
        for item in block_create_activity
    )

    block_updated = next(
        item for item in activity if item["activity_type"] == "block_updated"
    )
    assert set(block_updated["details"]["updated_fields"]) == {
        "block_type",
        "content",
        "properties",
    }
    assert block_updated["details"]["block_type"] == "heading"

    type_changed = next(
        item for item in activity if item["activity_type"] == "block_type_changed"
    )
    assert type_changed["details"]["previous_block_type"] == "paragraph"
    assert type_changed["details"]["block_type"] == "heading"

    block_deleted = next(
        item for item in activity if item["activity_type"] == "block_deleted"
    )
    assert block_deleted["block_id"] == toggle_id
    assert block_deleted["details"]["block_type"] == "toggle"
    assert block_deleted["details"]["children_deleted"] == 1


@pytest.mark.asyncio(loop_scope="module")
async def test_block_routes_enforce_viewer_read_only_and_editor_write_access() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "block-auth-owner-pass",
            first_name="Olivia",
            last_name="Owner",
        )
        viewer_email, viewer_id = await _create_user(
            "block-auth-viewer-pass",
            first_name="Vera",
            last_name="Viewer",
        )
        editor_email, editor_id = await _create_user(
            "block-auth-editor-pass",
            first_name="Eddie",
            last_name="Editor",
        )

        owner_headers = await _auth_headers(
            client, owner_email, "block-auth-owner-pass"
        )
        viewer_headers = await _auth_headers(
            client, viewer_email, "block-auth-viewer-pass"
        )
        editor_headers = await _auth_headers(
            client, editor_email, "block-auth-editor-pass"
        )

        doc = await _create_document(
            client,
            owner_headers,
            title="Block Auth Doc",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        default_blocks = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert default_blocks.status_code == 200, default_blocks.text
        default_block_id = default_blocks.json()[0]["id"]

        viewer_share = await client.post(
            f"/api/v1/documents/{document_id}/shares",
            json={"shared_with_user_id": str(viewer_id), "role": "viewer"},
            headers=owner_headers,
        )
        assert viewer_share.status_code == 201, viewer_share.text

        editor_share = await client.post(
            f"/api/v1/documents/{document_id}/shares",
            json={"shared_with_user_id": str(editor_id), "role": "editor"},
            headers=owner_headers,
        )
        assert editor_share.status_code == 201, editor_share.text

        viewer_get = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=viewer_headers,
        )
        viewer_create = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={"block_type": "heading", "position": 0},
            headers=viewer_headers,
        )
        viewer_reorder = await client.patch(
            f"/api/v1/documents/{document_id}/blocks/reorder",
            json={
                "items": [
                    {
                        "block_id": default_block_id,
                        "parent_block_id": None,
                        "position": 0,
                    }
                ]
            },
            headers=viewer_headers,
        )
        viewer_sync = await client.post(
            f"/api/v1/documents/{document_id}/blocks/sync",
            json={"tiptap_json": {"type": "doc", "content": [{"type": "paragraph"}]}},
            headers=viewer_headers,
        )
        editor_create = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={
                "block_type": "heading",
                "content": [{"type": "text", "text": "Editor heading"}],
                "position": 0,
            },
            headers=editor_headers,
        )
        editor_activity = await client.get(
            f"/api/v1/documents/{document_id}/activity",
            headers=owner_headers,
        )

    assert viewer_get.status_code == 200
    assert viewer_create.status_code == 403
    assert viewer_reorder.status_code == 403
    assert viewer_sync.status_code == 403
    assert editor_create.status_code == 201
    editor_created_block_id = editor_create.json()["id"]
    editor_block_activity = next(
        item
        for item in editor_activity.json()
        if item["activity_type"] == "block_created"
        and item["details"]["block_type"] == "heading"
    )
    assert editor_activity.status_code == 200
    assert editor_block_activity["block_id"] == editor_created_block_id


@pytest.mark.asyncio(loop_scope="module")
async def test_block_reorder_route_reparents_and_normalizes_positions() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "block-reorder-owner-pass",
            first_name="Riley",
            last_name="Arranger",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "block-reorder-owner-pass"
        )

        doc = await _create_document(
            client,
            owner_headers,
            title="Block Reorder Doc",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        default_blocks = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert default_blocks.status_code == 200, default_blocks.text
        default_block_id = default_blocks.json()[0]["id"]

        toggle_response = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={"block_type": "toggle", "position": 1},
            headers=owner_headers,
        )
        assert toggle_response.status_code == 201, toggle_response.text
        toggle_id = toggle_response.json()["id"]

        child_response = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={
                "parent_block_id": toggle_id,
                "block_type": "heading",
                "properties": {"level": 3},
                "content": [{"type": "text", "text": "Nested heading"}],
            },
            headers=owner_headers,
        )
        assert child_response.status_code == 201, child_response.text
        child_id = child_response.json()["id"]

        reorder_response = await client.patch(
            f"/api/v1/documents/{document_id}/blocks/reorder",
            json={
                "items": [
                    {
                        "block_id": child_id,
                        "parent_block_id": None,
                        "position": 0,
                    },
                    {
                        "block_id": default_block_id,
                        "parent_block_id": toggle_id,
                        "position": 0,
                    },
                ]
            },
            headers=owner_headers,
        )
        assert reorder_response.status_code == 200, reorder_response.text

        activity_response = await client.get(
            f"/api/v1/documents/{document_id}/activity",
            headers=owner_headers,
        )

    reordered_tree = reorder_response.json()
    assert [block["id"] for block in reordered_tree] == [child_id, toggle_id]
    assert [block["position"] for block in reordered_tree] == [0, 1]
    assert reordered_tree[1]["children"] == [
        {
            "id": default_block_id,
            "document_id": document_id,
            "parent_block_id": toggle_id,
            "block_type": "paragraph",
            "content": [],
            "properties": {},
            "position": 0,
            "children": [],
            "created_at": reordered_tree[1]["children"][0]["created_at"],
            "updated_at": reordered_tree[1]["children"][0]["updated_at"],
        }
    ]

    reorder_activity = next(
        item
        for item in activity_response.json()
        if item["activity_type"] == "block_reordered"
    )
    assert reorder_activity["details"]["moved_block_count"] == 2
    assert {item["block_id"] for item in reorder_activity["details"]["items"]} == {
        child_id,
        default_block_id,
    }


@pytest.mark.asyncio(loop_scope="module")
async def test_block_reorder_route_honors_single_item_move_to_occupied_position() -> (
    None
):
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "block-single-reorder-owner-pass",
            first_name="Casey",
            last_name="Mover",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "block-single-reorder-owner-pass"
        )

        doc = await _create_document(
            client,
            owner_headers,
            title="Single Block Reorder Doc",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        default_blocks = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert default_blocks.status_code == 200, default_blocks.text
        default_block_id = default_blocks.json()[0]["id"]

        second_response = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={
                "block_type": "heading",
                "position": 1,
                "properties": {"level": 2},
                "content": [{"type": "text", "text": "Block B"}],
            },
            headers=owner_headers,
        )
        assert second_response.status_code == 201, second_response.text
        second_block_id = second_response.json()["id"]

        third_response = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={
                "block_type": "paragraph",
                "position": 2,
                "content": [{"type": "text", "text": "Block C"}],
            },
            headers=owner_headers,
        )
        assert third_response.status_code == 201, third_response.text
        third_block_id = third_response.json()["id"]

        reorder_response = await client.patch(
            f"/api/v1/documents/{document_id}/blocks/reorder",
            json={
                "items": [
                    {
                        "block_id": third_block_id,
                        "parent_block_id": None,
                        "position": 0,
                    }
                ]
            },
            headers=owner_headers,
        )
        assert reorder_response.status_code == 200, reorder_response.text

        activity_response = await client.get(
            f"/api/v1/documents/{document_id}/activity",
            headers=owner_headers,
        )

    reordered_tree = reorder_response.json()
    assert [block["id"] for block in reordered_tree] == [
        third_block_id,
        default_block_id,
        second_block_id,
    ]
    assert [block["position"] for block in reordered_tree] == [0, 1, 2]

    reorder_activity = next(
        item
        for item in activity_response.json()
        if item["activity_type"] == "block_reordered"
    )
    assert reorder_activity["details"]["moved_block_count"] == 1
    assert reorder_activity["details"]["items"] == [
        {
            "block_id": third_block_id,
            "parent_block_id": None,
            "position": 0,
        }
    ]


@pytest.mark.asyncio(loop_scope="module")
async def test_block_sync_replaces_document_blocks_from_tiptap_json() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "block-sync-owner-pass",
            first_name="Sydney",
            last_name="Syncer",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "block-sync-owner-pass"
        )
        doc = await _create_document(
            client,
            owner_headers,
            title="Block Sync Doc",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        initial_blocks = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert initial_blocks.status_code == 200, initial_blocks.text
        preserved_block_id = initial_blocks.json()[0]["id"]

        sync_response = await client.post(
            f"/api/v1/documents/{document_id}/blocks/sync",
            json={
                "tiptap_json": {
                    "type": "doc",
                    "content": [
                        {
                            "type": "heading",
                            "attrs": {"level": 2},
                            "content": [{"type": "text", "text": "Title"}],
                        },
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": "Body"}],
                        },
                    ],
                },
                "preserve_ids": True,
            },
            headers=owner_headers,
        )

    assert sync_response.status_code == 200, sync_response.text
    synced_blocks = sync_response.json()
    assert len(synced_blocks) == 2
    assert synced_blocks[0]["id"] == preserved_block_id
    assert synced_blocks[0]["block_type"] == "heading"
    assert synced_blocks[0]["properties"] == {"level": 2}
    assert synced_blocks[0]["content"] == [{"type": "text", "text": "Title"}]
    assert synced_blocks[1]["block_type"] == "paragraph"
    assert synced_blocks[1]["id"] != preserved_block_id
    assert synced_blocks[1]["position"] == 1

    async with session_context() as session:
        result = await session.execute(
            select(models.DocumentBlock)
            .where(models.DocumentBlock.document_id == document_id)
            .order_by(models.DocumentBlock.position)
        )
        persisted_blocks = result.scalars().all()

    assert [str(block.id) for block in persisted_blocks] == [
        synced_blocks[0]["id"],
        synced_blocks[1]["id"],
    ]


@pytest.mark.asyncio(loop_scope="module")
async def test_block_sync_preserves_activity_block_ids_for_preserved_blocks() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "block-sync-audit-owner-pass",
            first_name="Avery",
            last_name="Auditor",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "block-sync-audit-owner-pass"
        )
        doc = await _create_document(
            client,
            owner_headers,
            title="Block Sync Audit Doc",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        heading_response = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={
                "block_type": "heading",
                "content": [{"type": "text", "text": "Stable heading"}],
                "properties": {"level": 2},
                "position": 0,
            },
            headers=owner_headers,
        )
        assert heading_response.status_code == 201, heading_response.text
        heading_id = heading_response.json()["id"]

        sync_response = await client.post(
            f"/api/v1/documents/{document_id}/blocks/sync",
            json={
                "tiptap_json": {
                    "type": "doc",
                    "content": [
                        {
                            "type": "heading",
                            "attrs": {"level": 2},
                            "content": [{"type": "text", "text": "Stable heading"}],
                        },
                        {"type": "paragraph"},
                    ],
                },
                "preserve_ids": True,
            },
            headers=owner_headers,
        )
        assert sync_response.status_code == 200, sync_response.text

        activity_response = await client.get(
            f"/api/v1/documents/{document_id}/activity",
            headers=owner_headers,
        )

    assert activity_response.status_code == 200
    created_heading_activity = next(
        item
        for item in activity_response.json()
        if item["activity_type"] == "block_created"
        and item["details"]["block_type"] == "heading"
    )
    assert created_heading_activity["block_id"] == heading_id


@pytest.mark.asyncio(loop_scope="module")
async def test_block_reorder_rejects_parent_cycles() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "block-cycle-owner-pass",
            first_name="Cleo",
            last_name="Cycle",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "block-cycle-owner-pass"
        )
        doc = await _create_document(
            client,
            owner_headers,
            title="Block Cycle Doc",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        first_root = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={"block_type": "heading", "position": 0},
            headers=owner_headers,
        )
        assert first_root.status_code == 201, first_root.text
        first_root_id = first_root.json()["id"]

        second_root = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={"block_type": "toggle", "position": 1},
            headers=owner_headers,
        )
        assert second_root.status_code == 201, second_root.text
        second_root_id = second_root.json()["id"]

        cycle_response = await client.patch(
            f"/api/v1/documents/{document_id}/blocks/reorder",
            json={
                "items": [
                    {
                        "block_id": first_root_id,
                        "parent_block_id": second_root_id,
                        "position": 0,
                    },
                    {
                        "block_id": second_root_id,
                        "parent_block_id": first_root_id,
                        "position": 0,
                    },
                ]
            },
            headers=owner_headers,
        )
        assert cycle_response.status_code == 400, cycle_response.text
        assert "parent cycles" in cycle_response.json()["detail"]

        blocks_after_response = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )

    assert blocks_after_response.status_code == 200
    blocks_after = blocks_after_response.json()
    assert {block["id"] for block in blocks_after} == {
        first_root_id,
        second_root_id,
        next(item["id"] for item in blocks_after if item["block_type"] == "paragraph"),
    }


@pytest.mark.asyncio(loop_scope="module")
async def test_block_routes_reject_invalid_structural_placements() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "block-structure-owner-pass",
            first_name="Morgan",
            last_name="Structure",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "block-structure-owner-pass"
        )
        doc = await _create_document(
            client,
            owner_headers,
            title="Block Structure Doc",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        root_table_cell = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={"block_type": "table_cell", "position": 0},
            headers=owner_headers,
        )
        assert root_table_cell.status_code == 400, root_table_cell.text
        assert "document root" in root_table_cell.json()["detail"]

        table_response = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={"block_type": "table", "position": 0},
            headers=owner_headers,
        )
        assert table_response.status_code == 201, table_response.text
        table_id = table_response.json()["id"]

        invalid_table_child = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={
                "parent_block_id": table_id,
                "block_type": "paragraph",
                "position": 0,
            },
            headers=owner_headers,
        )
        assert invalid_table_child.status_code == 400, invalid_table_child.text
        assert "beneath table" in invalid_table_child.json()["detail"]

        toggle_response = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={"block_type": "toggle", "position": 1},
            headers=owner_headers,
        )
        assert toggle_response.status_code == 201, toggle_response.text
        toggle_id = toggle_response.json()["id"]

        toggle_child = await client.post(
            f"/api/v1/documents/{document_id}/blocks",
            json={
                "parent_block_id": toggle_id,
                "block_type": "paragraph",
                "position": 0,
            },
            headers=owner_headers,
        )
        assert toggle_child.status_code == 201, toggle_child.text

        invalid_type_update = await client.patch(
            f"/api/v1/documents/{document_id}/blocks/{toggle_id}",
            json={"block_type": "paragraph"},
            headers=owner_headers,
        )
        assert invalid_type_update.status_code == 400, invalid_type_update.text
        assert "beneath paragraph" in invalid_type_update.json()["detail"]

        blocks_response = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert blocks_response.status_code == 200, blocks_response.text
        default_block_id = next(
            block["id"]
            for block in blocks_response.json()
            if block["block_type"] == "paragraph" and block["parent_block_id"] is None
        )

        invalid_reorder = await client.patch(
            f"/api/v1/documents/{document_id}/blocks/reorder",
            json={
                "items": [
                    {
                        "block_id": default_block_id,
                        "parent_block_id": table_id,
                        "position": 0,
                    }
                ]
            },
            headers=owner_headers,
        )
        assert invalid_reorder.status_code == 400, invalid_reorder.text
        assert "beneath table" in invalid_reorder.json()["detail"]

        invalid_sync = await client.post(
            f"/api/v1/documents/{document_id}/blocks/sync",
            json={
                "tiptap_json": {
                    "type": "doc",
                    "content": [
                        {
                            "type": "tableCell",
                            "content": [{"type": "paragraph"}],
                        }
                    ],
                }
            },
            headers=owner_headers,
        )

    assert invalid_sync.status_code == 400
    assert "document root" in invalid_sync.json()["detail"]


@pytest.mark.asyncio(loop_scope="module")
async def test_cell_doc_reference_routes_resolve_mentions_and_embeds() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, owner_id = await _create_user(
            "reference-owner-pass",
            first_name="Casey",
            last_name="Blocks",
            is_discoverable=True,
            headline="Reference target",
        )
        owner_headers = await _auth_headers(client, owner_email, "reference-owner-pass")

        source_doc = await _create_document(
            client,
            owner_headers,
            title="Source Cell Doc",
            kind="cell_doc",
            content=_cell_doc_content(_heading_node("Embed this heading")),
            content_format="tiptap_json",
        )
        target_doc = await _create_document(
            client,
            owner_headers,
            title="Target Cell Doc",
            kind="cell_doc",
            content=None,
        )

        source_document_id = source_doc["id"]
        target_document_id = target_doc["id"]

        source_blocks_response = await client.get(
            f"/api/v1/documents/{source_document_id}/blocks",
            headers=owner_headers,
        )
        assert source_blocks_response.status_code == 200, source_blocks_response.text
        source_heading_id = source_blocks_response.json()[0]["id"]

        mention_candidates_response = await client.get(
            f"/api/v1/documents/{target_document_id}/mention-candidates",
            params={"q": "Casey", "limit": 10},
            headers=owner_headers,
        )
        assert mention_candidates_response.status_code == 200, (
            mention_candidates_response.text
        )

        embed_document_candidates_response = await client.get(
            f"/api/v1/documents/{target_document_id}/embed-candidates",
            params={"q": "Source", "limit": 10},
            headers=owner_headers,
        )
        assert embed_document_candidates_response.status_code == 200, (
            embed_document_candidates_response.text
        )

        embed_block_candidates_response = await client.get(
            f"/api/v1/documents/{target_document_id}/embed-candidates",
            params={
                "source_document_id": source_document_id,
                "q": "Embed this heading",
                "limit": 10,
            },
            headers=owner_headers,
        )
        assert embed_block_candidates_response.status_code == 200, (
            embed_block_candidates_response.text
        )

        resolve_response = await client.post(
            f"/api/v1/documents/{target_document_id}/references/resolve",
            json={
                "references": [
                    {
                        "kind": "mention",
                        "target_kind": "user",
                        "target_id": str(owner_id),
                        "saved_label": "Fallback mention",
                    },
                    {
                        "kind": "embed",
                        "source_document_id": source_document_id,
                        "source_block_id": source_heading_id,
                        "saved_label": "Fallback embed",
                    },
                ]
            },
            headers=owner_headers,
        )

    assert resolve_response.status_code == 200, resolve_response.text
    mention_candidates = mention_candidates_response.json()
    assert any(
        candidate["target_kind"] == "user"
        and candidate["target_id"] == str(owner_id)
        and candidate["label"] == "Casey Blocks"
        for candidate in mention_candidates
    )

    embed_document_candidates = embed_document_candidates_response.json()
    assert any(
        candidate["candidate_kind"] == "document"
        and candidate["document_id"] == source_document_id
        for candidate in embed_document_candidates
    )

    embed_block_candidates = embed_block_candidates_response.json()
    assert len(embed_block_candidates) == 1
    assert embed_block_candidates[0]["block_id"] == source_heading_id
    assert embed_block_candidates[0]["label"] == "Embed this heading"

    resolved = resolve_response.json()
    assert resolved[0]["kind"] == "mention"
    assert resolved[0]["status"] == "resolved"
    assert resolved[0]["label"] == "Casey Blocks"
    assert resolved[0]["href"] == f"/network/discover/{owner_id}"
    assert resolved[1]["kind"] == "embed"
    assert resolved[1]["status"] == "resolved"
    assert resolved[1]["source_document_id"] == source_document_id
    assert resolved[1]["source_block_id"] == source_heading_id
    assert resolved[1]["label"] == "Embed this heading"
    assert resolved[1]["preview_text"] == "Embed this heading"


@pytest.mark.asyncio(loop_scope="module")
async def test_locked_blocks_block_collaborator_mutations_but_allow_owner_saves() -> (
    None
):
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, owner_id = await _create_user(
            "locked-owner-pass",
            first_name="Lena",
            last_name="Locker",
        )
        editor_email, editor_id = await _create_user(
            "locked-editor-pass",
            first_name="Eli",
            last_name="Editor",
        )
        owner_headers = await _auth_headers(client, owner_email, "locked-owner-pass")
        editor_headers = await _auth_headers(client, editor_email, "locked-editor-pass")

        doc = await _create_document(
            client,
            owner_headers,
            title="Locked Block Doc",
            kind="cell_doc",
            content=None,
        )
        document_id = doc["id"]

        blocks_response = await client.get(
            f"/api/v1/documents/{document_id}/blocks",
            headers=owner_headers,
        )
        assert blocks_response.status_code == 200, blocks_response.text
        locked_block_id = blocks_response.json()[0]["id"]

        share_response = await client.post(
            f"/api/v1/documents/{document_id}/shares",
            json={"shared_with_user_id": str(editor_id), "role": "editor"},
            headers=owner_headers,
        )
        assert share_response.status_code == 201, share_response.text

        lock_response = await client.patch(
            f"/api/v1/documents/{document_id}/blocks/{locked_block_id}",
            json={
                "properties": {
                    "locked": True,
                    "lockedAt": "2026-04-12T10:00:00Z",
                }
            },
            headers=owner_headers,
        )
        assert lock_response.status_code == 200, lock_response.text
        locked_block = lock_response.json()
        assert locked_block["properties"]["locked"] is True
        assert locked_block["properties"]["lockedAt"] == "2026-04-12T10:00:00Z"
        assert locked_block["properties"]["lockedByUserId"] == str(owner_id)

        collaborator_update = await client.patch(
            f"/api/v1/documents/{document_id}/blocks/{locked_block_id}",
            json={"content": [{"type": "text", "text": "Edited by collaborator"}]},
            headers=editor_headers,
        )
        collaborator_delete = await client.delete(
            f"/api/v1/documents/{document_id}/blocks/{locked_block_id}",
            headers=editor_headers,
        )
        collaborator_sync = await client.post(
            f"/api/v1/documents/{document_id}/blocks/sync",
            json={
                "tiptap_json": {
                    "type": "doc",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {"blockId": locked_block_id},
                            "content": [{"type": "text", "text": "Sync edit"}],
                        }
                    ],
                }
            },
            headers=editor_headers,
        )
        collaborator_version_save = await client.post(
            f"/api/v1/documents/{document_id}/versions",
            json={
                "name": "Collaborator edit",
                "content": json.dumps(
                    {
                        "type": "doc",
                        "content": [
                            {
                                "type": "paragraph",
                                "attrs": {"blockId": locked_block_id},
                                "content": [{"type": "text", "text": "Version edit"}],
                            }
                        ],
                    }
                ),
                "content_format": "tiptap_json",
                "change_summary": "Collaborator edit",
            },
            headers=editor_headers,
        )
        owner_version_save = await client.post(
            f"/api/v1/documents/{document_id}/versions",
            json={
                "name": "Owner edit",
                "content": json.dumps(
                    {
                        "type": "doc",
                        "content": [
                            {
                                "type": "paragraph",
                                "attrs": {
                                    "blockId": locked_block_id,
                                    "locked": True,
                                    "lockedAt": "2026-04-12T10:00:00Z",
                                },
                                "content": [{"type": "text", "text": "Owner can edit"}],
                            }
                        ],
                    }
                ),
                "content_format": "tiptap_json",
                "change_summary": "Owner edit",
            },
            headers=owner_headers,
        )

    assert collaborator_update.status_code == 403
    assert collaborator_delete.status_code == 403
    assert collaborator_sync.status_code == 403
    assert collaborator_version_save.status_code == 403
    assert "Locked blocks cannot be" in collaborator_version_save.json()["detail"]
    assert owner_version_save.status_code == 201, owner_version_save.text


@pytest.mark.asyncio(loop_scope="module")
async def test_generate_document_rejects_cell_doc_kind() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "block-generate-owner-pass",
            first_name="Gwen",
            last_name="Generator",
        )
        owner_headers = await _auth_headers(
            client, owner_email, "block-generate-owner-pass"
        )

        response = await client.post(
            "/api/v1/documents/generate",
            json={"kind": "cell_doc", "lead_id": str(uuid4())},
            headers=owner_headers,
        )

    assert response.status_code == 501
    assert "cell_doc" in response.json()["detail"]


@pytest.mark.asyncio(loop_scope="module")
async def test_upload_rules_and_cleanup_are_enforced() -> None:
    await _ensure_db_ready()

    async with _client() as client:
        owner_email, _ = await _create_user(
            "upload-owner-pass",
            first_name="Uma",
            last_name="Uploader",
        )
        owner_headers = await _auth_headers(client, owner_email, "upload-owner-pass")

        invalid_upload = await client.post(
            "/api/v1/documents/upload",
            data={"title": "Invalid", "kind": "freeform"},
            files={
                "file": ("notes.txt", b"plain text", "text/plain"),
            },
            headers=owner_headers,
        )
        assert invalid_upload.status_code == 400

        upload_response = await client.post(
            "/api/v1/documents/upload",
            data={"title": "Imported PDF", "kind": "freeform"},
            files={
                "file": (
                    "imported.pdf",
                    _build_pdf_bytes("Shared Studio import"),
                    "application/pdf",
                )
            },
            headers=owner_headers,
        )

        assert upload_response.status_code == 201, upload_response.text
        uploaded = upload_response.json()
        source_file = uploaded["head_version"]["source_file"]
        source_path = resolve_document_source_path(source_file)
        assert source_path.exists()

        original_response = await client.get(
            f"/api/v1/documents/{uploaded['id']}/original",
            headers=owner_headers,
        )
        assert original_response.status_code == 200, original_response.text
        assert original_response.headers["content-type"] == "application/pdf"

        delete_response = await client.delete(
            f"/api/v1/documents/{uploaded['id']}",
            headers=owner_headers,
        )

    assert delete_response.status_code == 204
    assert not source_path.exists()
    assert not source_path.parent.exists()
