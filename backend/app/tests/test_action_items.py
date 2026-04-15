"""Tests for the /action-items endpoints (CRUD, filters, from-application bridge)."""

from datetime import datetime, timedelta
from uuid import UUID, uuid4

import pytest

from app import models
from app.conftest import (
    async_client_ctx as _client,
)
from app.conftest import (
    create_user as _create_user,
)
from app.conftest import (
    login_and_get_headers as _auth_headers,
)
from app.core.db import session_context
from app.tests import utils

pytestmark = [
    pytest.mark.asyncio(loop_scope="module"),
    pytest.mark.usefixtures("fresh_db"),
]


async def _create_lead_and_application(
    user_id: UUID,
    *,
    next_step: str | None = None,
    next_step_due: datetime | None = None,
) -> UUID:
    """Create a lead + application for the given user, return application id."""
    async with session_context() as session:
        lead = await utils.create_lead(session)
        application = models.Application(
            stage=models.ApplicationStage.APPLIED,
            lead_id=lead.id,
            user_id=user_id,
            next_step=next_step,
            next_step_due=next_step_due,
        )
        session.add(application)
        await session.commit()
        return application.id


async def _create_conversation_for_user(user_id: UUID) -> UUID:
    """Create a direct conversation with one unread peer message."""
    _, peer_id = await _create_user("ai-conversation-peer-pass")

    async with session_context() as session:
        conversation = models.Conversation(
            type="direct",
            created_by_user_id=user_id,
        )
        session.add(conversation)
        await session.flush()

        session.add_all(
            [
                models.ConversationParticipant(
                    conversation_id=conversation.id,
                    user_id=user_id,
                    role="member",
                ),
                models.ConversationParticipant(
                    conversation_id=conversation.id,
                    user_id=peer_id,
                    role="member",
                ),
                models.Message(
                    conversation_id=conversation.id,
                    author_user_id=peer_id,
                    content="Checking in from the hiring team.",
                ),
            ]
        )
        await session.commit()
        return conversation.id


def _action_payload(**overrides) -> dict:
    base = {
        "title": "Follow up with recruiter",
        "kind": "follow_up",
        "priority": "medium",
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_create_action_item() -> None:
    """POST /action-items/ with valid payload returns 201."""
    async with _client() as client:
        email, uid = await _create_user("ai-create-pass")
        headers = await _auth_headers(client, email, "ai-create-pass")

        response = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(),
            headers=headers,
        )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Follow up with recruiter"
    assert body["kind"] == "follow_up"
    assert body["status"] == "pending"
    assert body["priority"] == "medium"
    assert body["user_id"] == str(uid)


async def test_create_action_item_with_application_link() -> None:
    """POST /action-items/ with application_id stores the FK."""
    async with _client() as client:
        email, uid = await _create_user("ai-applink-pass")
        headers = await _auth_headers(client, email, "ai-applink-pass")
        app_id = await _create_lead_and_application(uid)

        response = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(application_id=str(app_id)),
            headers=headers,
        )

    assert response.status_code == 201
    body = response.json()
    assert body["application_id"] == str(app_id)


async def test_create_action_item_validation() -> None:
    """POST /action-items/ with missing required field returns 422."""
    async with _client() as client:
        email, uid = await _create_user("ai-val-pass")
        headers = await _auth_headers(client, email, "ai-val-pass")

        # Missing 'title' and 'kind'
        response = await client.post(
            "/api/v1/action-items/",
            json={"priority": "high"},
            headers=headers,
        )

    assert response.status_code == 422


async def test_list_action_items() -> None:
    """GET /action-items/ returns all items for the authenticated user."""
    async with _client() as client:
        email, uid = await _create_user("ai-list-pass")
        headers = await _auth_headers(client, email, "ai-list-pass")

        for i in range(3):
            resp = await client.post(
                "/api/v1/action-items/",
                json=_action_payload(title=f"Task {i}"),
                headers=headers,
            )
            assert resp.status_code == 201

        response = await client.get("/api/v1/action-items/", headers=headers)

    assert response.status_code == 200
    body = response.json()
    items = body["items"]
    assert len(items) == 3
    assert body["total"] == 3
    assert body["page"] == 1
    assert body["page_size"] == 50


async def test_list_action_items_includes_application_details_without_lazy_load_errors() -> (
    None
):
    """GET /action-items/ serializes linked application details for dashboard cards."""
    async with _client() as client:
        email, uid = await _create_user("ai-list-linked-pass")
        headers = await _auth_headers(client, email, "ai-list-linked-pass")
        app_id = await _create_lead_and_application(uid)

        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(
                title="Review active application",
                application_id=str(app_id),
            ),
            headers=headers,
        )
        assert create_resp.status_code == 201

        response = await client.get("/api/v1/action-items/", headers=headers)

    assert response.status_code == 200
    body = response.json()
    linked_item = next(
        item for item in body["items"] if item["application_id"] == str(app_id)
    )
    assert linked_item["application"]["id"] == str(app_id)
    assert (
        linked_item["application"]["lead"]["id"]
        == linked_item["application"]["lead_id"]
    )
    assert linked_item["application"]["user"]["id"] == str(uid)
    assert isinstance(linked_item["application"]["status_history"], list)


async def test_get_action_item_includes_linked_conversation_details() -> None:
    """GET /action-items/{id} includes route-shaped linked conversation data."""
    async with _client() as client:
        email, uid = await _create_user("ai-conversation-detail-pass")
        headers = await _auth_headers(client, email, "ai-conversation-detail-pass")
        conversation_id = await _create_conversation_for_user(uid)

        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(
                title="Reply to recruiter",
                kind="send_message",
                conversation_id=str(conversation_id),
            ),
            headers=headers,
        )
        assert create_resp.status_code == 201
        item_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/action-items/{item_id}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["conversation_id"] == str(conversation_id)
    assert body["conversation"]["id"] == str(conversation_id)
    assert body["conversation"]["participants"][0]["display_name"]
    assert (
        body["conversation"]["last_message"]["content"]
        == "Checking in from the hiring team."
    )
    assert body["conversation"]["unread_count"] == 1


async def test_list_action_items_filter_by_status() -> None:
    """GET /action-items/?status=pending returns only pending items."""
    async with _client() as client:
        email, uid = await _create_user("ai-filt-status-pass")
        headers = await _auth_headers(client, email, "ai-filt-status-pass")

        await client.post(
            "/api/v1/action-items/",
            json=_action_payload(title="Pending task", status="pending"),
            headers=headers,
        )
        resp2 = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(title="In-progress task", status="in_progress"),
            headers=headers,
        )
        assert resp2.status_code == 201

        response = await client.get(
            "/api/v1/action-items/", params={"status": "pending"}, headers=headers
        )

    assert response.status_code == 200
    items = response.json()["items"]
    assert all(item["status"] == "pending" for item in items)
    assert any(item["title"] == "Pending task" for item in items)


async def test_list_action_items_filter_by_kind() -> None:
    """GET /action-items/?kind=follow_up returns only follow_up items."""
    async with _client() as client:
        email, uid = await _create_user("ai-filt-kind-pass")
        headers = await _auth_headers(client, email, "ai-filt-kind-pass")

        await client.post(
            "/api/v1/action-items/",
            json=_action_payload(title="Follow up", kind="follow_up"),
            headers=headers,
        )
        await client.post(
            "/api/v1/action-items/",
            json=_action_payload(title="Prep doc", kind="prepare_document"),
            headers=headers,
        )

        response = await client.get(
            "/api/v1/action-items/", params={"kind": "follow_up"}, headers=headers
        )

    assert response.status_code == 200
    items = response.json()["items"]
    assert all(item["kind"] == "follow_up" for item in items)


async def test_list_action_items_filter_by_priority() -> None:
    """GET /action-items/?priority=high returns only high-priority items."""
    async with _client() as client:
        email, uid = await _create_user("ai-filt-pri-pass")
        headers = await _auth_headers(client, email, "ai-filt-pri-pass")

        await client.post(
            "/api/v1/action-items/",
            json=_action_payload(title="High", priority="high"),
            headers=headers,
        )
        await client.post(
            "/api/v1/action-items/",
            json=_action_payload(title="Low", priority="low"),
            headers=headers,
        )

        response = await client.get(
            "/api/v1/action-items/", params={"priority": "high"}, headers=headers
        )

    assert response.status_code == 200
    items = response.json()["items"]
    assert all(item["priority"] == "high" for item in items)


async def test_get_action_item() -> None:
    """GET /action-items/{id} returns 200 with detail."""
    async with _client() as client:
        email, uid = await _create_user("ai-get-pass")
        headers = await _auth_headers(client, email, "ai-get-pass")

        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(),
            headers=headers,
        )
        item_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/action-items/{item_id}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == item_id
    assert body["title"] == "Follow up with recruiter"


async def test_get_action_item_not_found() -> None:
    """GET /action-items/{random_uuid} returns 404."""
    async with _client() as client:
        email, uid = await _create_user("ai-notfound-pass")
        headers = await _auth_headers(client, email, "ai-notfound-pass")

        response = await client.get(f"/api/v1/action-items/{uuid4()}", headers=headers)

    assert response.status_code == 404


async def test_update_action_item() -> None:
    """PATCH /action-items/{id} updates title and status."""
    async with _client() as client:
        email, uid = await _create_user("ai-update-pass")
        headers = await _auth_headers(client, email, "ai-update-pass")

        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(),
            headers=headers,
        )
        item_id = create_resp.json()["id"]

        response = await client.patch(
            f"/api/v1/action-items/{item_id}",
            json={"title": "Updated title", "status": "in_progress"},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Updated title"
    assert body["status"] == "in_progress"


async def test_update_action_item_complete_sets_completed_at() -> None:
    """PATCH with status=completed auto-sets completed_at."""
    async with _client() as client:
        email, uid = await _create_user("ai-complete-pass")
        headers = await _auth_headers(client, email, "ai-complete-pass")

        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(),
            headers=headers,
        )
        item_id = create_resp.json()["id"]

        response = await client.patch(
            f"/api/v1/action-items/{item_id}",
            json={"status": "completed"},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["completed_at"] is not None


async def test_update_action_item_uncomplete_clears_completed_at() -> None:
    """After completing, PATCH with status=pending clears completed_at."""
    async with _client() as client:
        email, uid = await _create_user("ai-uncomplete-pass")
        headers = await _auth_headers(client, email, "ai-uncomplete-pass")

        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(),
            headers=headers,
        )
        item_id = create_resp.json()["id"]

        # Complete the item
        await client.patch(
            f"/api/v1/action-items/{item_id}",
            json={"status": "completed"},
            headers=headers,
        )

        # Uncomplete it
        response = await client.patch(
            f"/api/v1/action-items/{item_id}",
            json={"status": "pending"},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    assert body["completed_at"] is None


async def test_delete_action_item() -> None:
    """DELETE /action-items/{id} returns 204; subsequent GET returns 404."""
    async with _client() as client:
        email, uid = await _create_user("ai-delete-pass")
        headers = await _auth_headers(client, email, "ai-delete-pass")

        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(),
            headers=headers,
        )
        item_id = create_resp.json()["id"]

        del_resp = await client.delete(
            f"/api/v1/action-items/{item_id}", headers=headers
        )
        assert del_resp.status_code == 204

        get_resp = await client.get(f"/api/v1/action-items/{item_id}", headers=headers)

    assert get_resp.status_code == 404


async def test_action_item_user_isolation() -> None:
    """User B cannot GET, PATCH, or DELETE user A's action items."""
    async with _client() as client:
        email_a, uid_a = await _create_user("ai-iso-a-pass")
        email_b, uid_b = await _create_user("ai-iso-b-pass")
        headers_a = await _auth_headers(client, email_a, "ai-iso-a-pass")
        headers_b = await _auth_headers(client, email_b, "ai-iso-b-pass")

        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(),
            headers=headers_a,
        )
        item_id = create_resp.json()["id"]

        get_resp = await client.get(
            f"/api/v1/action-items/{item_id}", headers=headers_b
        )
        patch_resp = await client.patch(
            f"/api/v1/action-items/{item_id}",
            json={"title": "Hacked"},
            headers=headers_b,
        )
        del_resp = await client.delete(
            f"/api/v1/action-items/{item_id}", headers=headers_b
        )

    # Route returns 404 for items not owned by the requesting user
    assert get_resp.status_code == 404
    assert patch_resp.status_code == 404
    assert del_resp.status_code == 404


async def test_create_action_item_from_application() -> None:
    """POST /action-items/from-application/{id} creates an ActionItem from next_step."""
    async with _client() as client:
        email, uid = await _create_user("ai-bridge-pass")
        headers = await _auth_headers(client, email, "ai-bridge-pass")
        due = datetime.utcnow() + timedelta(days=3)
        app_id = await _create_lead_and_application(
            uid, next_step="Call recruiter", next_step_due=due
        )

        response = await client.post(
            f"/api/v1/action-items/from-application/{app_id}",
            headers=headers,
        )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Call recruiter"
    assert body["kind"] == "follow_up"
    assert body["application_id"] == str(app_id)
    assert body["due_at"] is not None


async def test_create_action_item_from_application_no_next_step() -> None:
    """POST bridge endpoint returns 400 when application has no next_step."""
    async with _client() as client:
        email, uid = await _create_user("ai-bridge-no-pass")
        headers = await _auth_headers(client, email, "ai-bridge-no-pass")
        app_id = await _create_lead_and_application(uid, next_step=None)

        response = await client.post(
            f"/api/v1/action-items/from-application/{app_id}",
            headers=headers,
        )

    assert response.status_code == 400
