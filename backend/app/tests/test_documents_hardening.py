"""Focused backend tests for document sharing, activity, and upload hardening."""

from contextlib import asynccontextmanager
from io import BytesIO
from uuid import UUID

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from reportlab.pdfgen import canvas

from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.core.document_storage import resolve_document_source_path
from app.main import app
from app.tests import utils

password_helper = PasswordHelper()
_db_ready = False


@asynccontextmanager
async def _client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


async def _ensure_db_ready() -> None:
    global _db_ready
    if _db_ready:
        return

    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    app.state.bootstrap_completed = True
    _db_ready = True


async def _create_user(
    password: str,
    *,
    is_superuser: bool = False,
    **fields,
) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=is_superuser,
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
        "/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_document(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    title: str,
    content: str = "Base draft",
) -> dict:
    response = await client.post(
        "/documents/",
        json={
            "kind": "freeform",
            "title": title,
            "content": content,
            "content_format": "plain_text",
        },
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
            f"/documents/{document_id}/shares",
            json={"shared_with_user_id": str(existing_id), "role": "viewer"},
            headers=owner_headers,
        )
        assert share_response.status_code == 201, share_response.text

        response = await client.get(
            f"/documents/{document_id}/share-candidates",
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
            f"/documents/{document_id}/shares",
            json={"shared_with_user_id": str(viewer_id), "role": "editor"},
            headers=owner_headers,
        )
        assert create_share.status_code == 201, create_share.text

        shares_response = await client.get(
            f"/documents/{document_id}/shares",
            headers=owner_headers,
        )
        detail_response = await client.get(
            f"/documents/{document_id}",
            headers=viewer_headers,
        )
        shared_with_me_response = await client.get(
            "/documents/shared-with-me",
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
            f"/documents/{document_id}/versions",
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
            f"/documents/{document_id}/shares",
            json={"shared_with_user_id": str(collaborator_id), "role": "viewer"},
            headers=owner_headers,
        )
        assert create_share.status_code == 201, create_share.text
        share_id = create_share.json()["id"]

        update_share = await client.patch(
            f"/documents/{document_id}/shares/{share_id}",
            json={"role": "editor"},
            headers=owner_headers,
        )
        assert update_share.status_code == 200, update_share.text

        delete_share = await client.delete(
            f"/documents/{document_id}/shares/{share_id}",
            headers=owner_headers,
        )
        assert delete_share.status_code == 204, delete_share.text

        archive_response = await client.patch(
            f"/documents/{document_id}",
            json={"status": "archived"},
            headers=owner_headers,
        )
        assert archive_response.status_code == 200, archive_response.text

        restore_response = await client.patch(
            f"/documents/{document_id}",
            json={"status": "active"},
            headers=owner_headers,
        )
        assert restore_response.status_code == 200, restore_response.text

        pin_response = await client.post(
            f"/documents/{document_id}/pin",
            json={"pinned": True},
            headers=owner_headers,
        )
        assert pin_response.status_code == 200, pin_response.text

        unpin_response = await client.post(
            f"/documents/{document_id}/pin",
            json={"pinned": False},
            headers=owner_headers,
        )
        assert unpin_response.status_code == 200, unpin_response.text

        activity_response = await client.get(
            f"/documents/{document_id}/activity",
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
    assert all(item["message"] for item in activity)


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
            "/documents/upload",
            data={"title": "Invalid", "kind": "freeform"},
            files={
                "file": ("notes.txt", b"plain text", "text/plain"),
            },
            headers=owner_headers,
        )
        assert invalid_upload.status_code == 400

        upload_response = await client.post(
            "/documents/upload",
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
            f"/documents/{uploaded['id']}/original",
            headers=owner_headers,
        )
        assert original_response.status_code == 200, original_response.text
        assert original_response.headers["content-type"] == "application/pdf"

        delete_response = await client.delete(
            f"/documents/{uploaded['id']}",
            headers=owner_headers,
        )

    assert delete_response.status_code == 204
    assert not source_path.exists()
    assert not source_path.parent.exists()
