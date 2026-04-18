"""Tests for the /activity-feed endpoints (feed, summary)."""

from datetime import datetime, timedelta
from uuid import UUID, uuid4

import pytest

from app import models
from app.api.routes import activity_feed as activity_feed_route
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

pytestmark = [
    pytest.mark.asyncio(loop_scope="module"),
    pytest.mark.usefixtures("fresh_db"),
]


def _action_payload(**overrides) -> dict:
    base = {
        "title": "Feed test task",
        "kind": "follow_up",
        "priority": "medium",
    }
    base.update(overrides)
    return base


async def _create_application_with_history(
    *,
    user_id: UUID,
    title: str,
    current_stage: models.ApplicationStage,
    current_outcome: models.ApplicationOutcome | None = None,
    history: list[dict[str, object]],
) -> UUID:
    """Create an Application with ApplicationStatusHistory rows.

    Each ``history`` dict should have ``stage``, optional ``outcome``, and
    ``changed_at`` (ISO-8601 str or datetime).
    """
    job_slug = uuid4()
    async with session_context() as session:
        lead = models.Lead(
            url=f"https://example.com/jobs/{job_slug}",
            canonical_url=f"https://example.com/jobs/{job_slug}",
            title=title,
        )
        session.add(lead)
        await session.flush()

        application = models.Application(
            stage=current_stage,
            outcome=current_outcome,
            user_id=user_id,
            lead_id=lead.id,
        )
        session.add(application)
        await session.flush()

        for entry in history:
            raw_ts = entry["changed_at"]
            ts = (
                raw_ts
                if isinstance(raw_ts, datetime)
                else datetime.fromisoformat(str(raw_ts))
            )
            row = models.ApplicationStatusHistory(
                application_id=application.id,
                stage=models.ApplicationStage(entry["stage"]),
                outcome=(
                    models.ApplicationOutcome(entry["outcome"])
                    if entry.get("outcome")
                    else None
                ),
                changed_by_user_id=user_id,
                changed_at=ts,
            )
            session.add(row)

        await session.commit()
        return application.id


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_activity_feed_status_value_normalizes_strings_and_enums() -> None:
    assert (
        activity_feed_route._status_value(models.ApplicationStage.APPLIED) == "applied"
    )
    assert (
        activity_feed_route._status_value(models.ApplicationOutcome.REJECTED)
        == "rejected"
    )
    assert activity_feed_route._status_value("WiThDrAwN") == "withdrawn"


async def test_activity_feed_empty() -> None:
    """New user with no data gets an empty feed."""
    async with _client() as client:
        email, uid = await _create_user("feed-empty-pass")
        headers = await _auth_headers(client, email, "feed-empty-pass")

        response = await client.get("/api/v1/activity-feed/", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


async def test_activity_feed_returns_action_completions() -> None:
    """Completing an ActionItem surfaces an 'action_completed' event in the feed."""
    async with _client() as client:
        email, uid = await _create_user("feed-action-pass")
        headers = await _auth_headers(client, email, "feed-action-pass")

        # Create and complete an action item
        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(title="Completable task"),
            headers=headers,
        )
        assert create_resp.status_code == 201
        item_id = create_resp.json()["id"]

        await client.patch(
            f"/api/v1/action-items/{item_id}",
            json={"status": "completed"},
            headers=headers,
        )

        response = await client.get("/api/v1/activity-feed/", headers=headers)

    assert response.status_code == 200
    body = response.json()
    completed_events = [
        item for item in body["items"] if item["type"] == "action_completed"
    ]
    assert len(completed_events) >= 1
    assert any(e["title"] == "Completable task" for e in completed_events)


async def test_activity_feed_pagination() -> None:
    """Feed respects page and page_size parameters."""
    async with _client() as client:
        email, uid = await _create_user("feed-page-pass")
        headers = await _auth_headers(client, email, "feed-page-pass")

        # Create and complete several action items to generate feed events
        for i in range(7):
            create_resp = await client.post(
                "/api/v1/action-items/",
                json=_action_payload(title=f"Paginated task {i}"),
                headers=headers,
            )
            assert create_resp.status_code == 201
            item_id = create_resp.json()["id"]
            await client.patch(
                f"/api/v1/action-items/{item_id}",
                json={"status": "completed"},
                headers=headers,
            )

        page1 = await client.get(
            "/api/v1/activity-feed/",
            params={"page": 1, "page_size": 5},
            headers=headers,
        )
        page2 = await client.get(
            "/api/v1/activity-feed/",
            params={"page": 2, "page_size": 5},
            headers=headers,
        )

    assert page1.status_code == 200
    assert page2.status_code == 200
    body1 = page1.json()
    body2 = page2.json()
    assert len(body1["items"]) == 5
    assert body1["total"] >= 7
    assert len(body2["items"]) >= 2  # remaining items on page 2


async def test_activity_feed_since_filter() -> None:
    """Feed 'since' param excludes action items completed before that date."""
    async with _client() as client:
        email, uid = await _create_user("feed-since-pass")
        headers = await _auth_headers(client, email, "feed-since-pass")

        # Create and complete an action item now
        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(title="Recent task"),
            headers=headers,
        )
        assert create_resp.status_code == 201
        item_id = create_resp.json()["id"]
        await client.patch(
            f"/api/v1/action-items/{item_id}",
            json={"status": "completed"},
            headers=headers,
        )

        # Query with 'since' set to 1 hour ago — should include the item
        since = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        response = await client.get(
            "/api/v1/activity-feed/",
            params={"since": since},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    completed = [i for i in body["items"] if i["type"] == "action_completed"]
    assert len(completed) >= 1

    # Query with 'since' far in the future — should exclude everything
    async with _client() as client:
        headers = await _auth_headers(client, email, "feed-since-pass")
        future_since = (datetime.utcnow() + timedelta(days=30)).isoformat()
        response_empty = await client.get(
            "/api/v1/activity-feed/",
            params={"since": future_since},
            headers=headers,
        )

    assert response_empty.status_code == 200
    assert response_empty.json()["total"] == 0


async def test_activity_feed_user_isolation() -> None:
    """User B sees an empty feed even when user A has activity."""
    async with _client() as client:
        email_a, uid_a = await _create_user("feed-iso-a-pass")
        email_b, uid_b = await _create_user("feed-iso-b-pass")
        headers_a = await _auth_headers(client, email_a, "feed-iso-a-pass")
        headers_b = await _auth_headers(client, email_b, "feed-iso-b-pass")

        # User A creates and completes an action item
        create_resp = await client.post(
            "/api/v1/action-items/",
            json=_action_payload(title="A's task"),
            headers=headers_a,
        )
        assert create_resp.status_code == 201
        item_id = create_resp.json()["id"]
        await client.patch(
            f"/api/v1/action-items/{item_id}",
            json={"status": "completed"},
            headers=headers_a,
        )

        # User B should see no events
        response = await client.get("/api/v1/activity-feed/", headers=headers_b)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["items"] == []


async def test_summary_endpoint() -> None:
    """GET /activity-feed/summary returns expected CommandCenterSummary fields."""
    async with _client() as client:
        email, uid = await _create_user("feed-summary-pass")
        headers = await _auth_headers(client, email, "feed-summary-pass")
        app_id = await _create_application_with_history(
            user_id=uid,
            title="Summary-linked application",
            current_stage=models.ApplicationStage.APPLIED,
            history=[
                {"stage": "applied", "changed_at": "2026-04-01T00:00:00"},
            ],
        )

        # Create some action items to be counted
        for i in range(2):
            await client.post(
                "/api/v1/action-items/",
                json=_action_payload(
                    title=f"Summary task {i}",
                    application_id=str(app_id),
                ),
                headers=headers,
            )

        response = await client.get("/api/v1/activity-feed/summary", headers=headers)

    assert response.status_code == 200
    body = response.json()
    # Verify all expected fields are present
    assert "lead_count" in body
    assert "unapplied_lead_count" in body
    assert "application_count" in body
    assert "active_application_count" in body
    assert "status_breakdown" in body
    assert "avg_days_per_stage" in body
    assert "offer_conversion_funnel" in body
    assert "pending_action_items" in body
    assert "overdue_action_items" in body
    assert "action_items_due_today" in body
    assert "pending_connections" in body
    assert "unread_messages" in body
    assert "profile_completion" in body
    assert "documents_count" in body
    assert "draft_documents_count" in body
    # Action item counts should reflect creation
    assert body["pending_action_items"] >= 2


async def test_summary_endpoint_returns_stage_velocity_and_offer_conversion() -> None:
    """Dashboard summary exposes dwell-time and monotonic offer-funnel analytics."""
    async with _client() as client:
        email, uid = await _create_user("feed-summary-analytics-pass")
        headers = await _auth_headers(client, email, "feed-summary-analytics-pass")

        await _create_application_with_history(
            user_id=uid,
            title="Analytics app one",
            current_stage=models.ApplicationStage.INTERVIEW,
            current_outcome=models.ApplicationOutcome.REJECTED,
            history=[
                {"stage": "applied", "changed_at": "2026-04-01T00:00:00"},
                {"stage": "screening", "changed_at": "2026-04-04T00:00:00"},
                {"stage": "interview", "changed_at": "2026-04-07T00:00:00"},
                {
                    "stage": "interview",
                    "outcome": "rejected",
                    "changed_at": "2026-04-10T00:00:00",
                },
            ],
        )
        await _create_application_with_history(
            user_id=uid,
            title="Analytics app two",
            current_stage=models.ApplicationStage.OFFER,
            current_outcome=models.ApplicationOutcome.WITHDRAWN,
            history=[
                {"stage": "applied", "changed_at": "2026-04-02T00:00:00"},
                {"stage": "screening", "changed_at": "2026-04-06T00:00:00"},
                {"stage": "offer", "changed_at": "2026-04-10T00:00:00"},
                {
                    "stage": "offer",
                    "outcome": "withdrawn",
                    "changed_at": "2026-04-12T00:00:00",
                },
            ],
        )

        response = await client.get("/api/v1/activity-feed/summary", headers=headers)

    assert response.status_code == 200
    body = response.json()

    velocity = {entry["stage"]: entry for entry in body["avg_days_per_stage"]}
    assert velocity["applied"]["avg_days"] == 3.5
    assert velocity["applied"]["sample_size"] == 2
    assert velocity["screening"]["avg_days"] == 3.5
    assert velocity["screening"]["sample_size"] == 2
    assert velocity["interview"]["avg_days"] == 3.0
    assert velocity["interview"]["sample_size"] == 1
    assert velocity["offer"]["avg_days"] == 2.0
    assert velocity["offer"]["sample_size"] == 1

    funnel = {entry["stage"]: entry for entry in body["offer_conversion_funnel"]}
    assert funnel["applied"]["reached_count"] == 2
    assert funnel["applied"]["conversion_from_previous"] is None
    assert funnel["applied"]["conversion_from_applied"] == 100.0
    assert funnel["screening"]["reached_count"] == 2
    assert funnel["screening"]["conversion_from_previous"] == 100.0
    assert funnel["screening"]["conversion_from_applied"] == 100.0
    assert funnel["interview"]["reached_count"] == 2
    assert funnel["interview"]["conversion_from_previous"] == 100.0
    assert funnel["interview"]["conversion_from_applied"] == 100.0
    assert funnel["offer"]["reached_count"] == 1
    assert funnel["offer"]["conversion_from_previous"] == 50.0
    assert funnel["offer"]["conversion_from_applied"] == 50.0


async def test_summary_empty_user() -> None:
    """GET /activity-feed/summary for a new user returns all zeros."""
    async with _client() as client:
        email, uid = await _create_user("feed-summary-empty-pass")
        headers = await _auth_headers(client, email, "feed-summary-empty-pass")

        response = await client.get("/api/v1/activity-feed/summary", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["lead_count"] == 0
    assert body["unapplied_lead_count"] == 0
    assert body["application_count"] == 0
    assert body["active_application_count"] == 0
    assert body["status_breakdown"] == {}
    assert body["avg_days_per_stage"] == []
    assert len(body["offer_conversion_funnel"]) == 4
    assert all(entry["reached_count"] == 0 for entry in body["offer_conversion_funnel"])
    assert body["pending_action_items"] == 0
    assert body["overdue_action_items"] == 0
    assert body["action_items_due_today"] == 0
    assert body["pending_connections"] == 0
    assert body["unread_messages"] == 0
    assert body["profile_completion"] == 0
    assert body["documents_count"] == 0
    assert body["draft_documents_count"] == 0
