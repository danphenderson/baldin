"""Tests for /applications/ CRUD, status-history, and document-attachment routes.

Covers the highest-risk route paths that lacked direct test coverage
(finding T7 in executive-summary.md).  Uses the same module-local helper
pattern already established in test_action_items.py and test_leads.py.

A single user session is shared across most tests to stay under the
10/minute auth rate-limit configured for ``/auth/jwt/login``.
"""

from contextlib import asynccontextmanager
from uuid import UUID, uuid4

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient

from app import models
from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False

# Module-level cached auth state (populated by first test that calls _get_auth).
_cached_user: tuple[str, UUID, str] | None = None  # (email, uid, password)
_cached_headers: dict[str, str] | None = None


# ---------------------------------------------------------------------------
# Module-local helpers (match existing test conventions)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def _client():
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
    password: str, *, is_superuser: bool = False
) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=is_superuser,
        )
        await session.commit()
    return email, user.id


async def _auth_headers(
    client: AsyncClient, email: str, password: str
) -> dict[str, str]:
    app.state.limiter.reset()
    response = await client.post(
        "/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _get_auth(client: AsyncClient) -> tuple[UUID, dict[str, str]]:
    """Return (user_id, auth_headers), creating the user once per module."""
    global _cached_user, _cached_headers
    if _cached_headers is not None and _cached_user is not None:
        return _cached_user[1], _cached_headers
    password = "AppRouteTest1!"
    email, uid = await _create_user(password)
    headers = await _auth_headers(client, email, password)
    _cached_user = (email, uid, password)
    _cached_headers = headers
    return uid, headers


async def _create_lead() -> UUID:
    """Create a standalone lead and return its id."""
    async with session_context() as session:
        lead = await utils.create_lead(session)
        return lead.id


async def _create_document_via_db(
    user_id: UUID, *, kind: str = "resume", title: str = "Test Doc"
) -> UUID:
    """Create a minimal document owned by *user_id* and return its id."""
    async with session_context() as session:
        doc = models.Document(
            title=title,
            kind=kind,
            status="draft",
            user_id=user_id,
        )
        session.add(doc)
        await session.commit()
        return doc.id


def _assert_document_metadata(
    payload: dict[str, object],
    *,
    total_count: int,
    has_resume: bool,
    has_cover_letter: bool,
    kinds: set[str],
) -> None:
    metadata = payload["document_metadata"]
    assert isinstance(metadata, dict)
    assert metadata["total_count"] == total_count
    assert metadata["has_resume"] is has_resume
    assert metadata["has_cover_letter"] is has_cover_letter
    assert set(metadata["kinds"]) == kinds


async def _create_versioned_document_via_db(
    user_id: UUID,
    *,
    title: str = "Test Doc",
    content: str = "Document body",
) -> UUID:
    async with session_context() as session:
        doc = models.Document(
            title=title,
            kind="resume",
            status="draft",
            user_id=user_id,
        )
        session.add(doc)
        await session.flush()

        version = models.DocumentVersion(
            document_id=doc.id,
            version_number=1,
            name="v1",
            content=content,
            content_format="plain_text",
        )
        session.add(version)
        await session.flush()

        doc.head_version_id = version.id
        await session.commit()
        return doc.id


async def _create_application_via_api(
    client: AsyncClient,
    headers: dict[str, str],
    lead_id: UUID,
    *,
    stage: str = "applied",
) -> dict[str, object]:
    response = await client.post(
        "/applications/",
        json={"lead_id": str(lead_id), "stage": stage},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


# ---------------------------------------------------------------------------
# POST /applications/ — create
# ---------------------------------------------------------------------------


async def test_create_application_happy_path() -> None:
    """POST /applications/ with valid payload returns 201 and expected fields."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        response = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )

    assert response.status_code == 201
    body = response.json()
    assert body["lead_id"] == str(lead_id)
    assert body["user_id"] == str(uid)
    assert body["stage"] == "applied"
    # status_history should contain the initial entry
    assert isinstance(body.get("status_history"), list)
    assert len(body["status_history"]) >= 1
    assert body["status_history"][0]["stage"] == "applied"
    _assert_document_metadata(
        body,
        total_count=0,
        has_resume=False,
        has_cover_letter=False,
        kinds=set(),
    )


async def test_create_application_with_document_ids_returns_document_metadata() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()
        document_ids = [
            await _create_document_via_db(uid, kind="resume", title="Resume"),
            await _create_document_via_db(uid, kind="freeform", title="Notes"),
        ]

        response = await client.post(
            "/applications/",
            json={
                "lead_id": str(lead_id),
                "stage": "applied",
                "document_ids": [str(document_id) for document_id in document_ids],
            },
            headers=headers,
        )

    assert response.status_code == 201
    body = response.json()
    _assert_document_metadata(
        body,
        total_count=2,
        has_resume=True,
        has_cover_letter=False,
        kinds={"resume", "freeform"},
    )


async def test_create_application_duplicate_lead_returns_400() -> None:
    """Creating two applications for the same lead returns 400."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        first = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )
        assert first.status_code == 201

        second = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "screening"},
            headers=headers,
        )

    assert second.status_code == 400
    assert "already exists" in second.json()["detail"].lower()


async def test_create_application_validation_error() -> None:
    """POST /applications/ with missing required fields returns 422."""
    await _ensure_db_ready()
    async with _client() as client:
        _, headers = await _get_auth(client)

        # Missing lead_id and status
        response = await client.post(
            "/applications/",
            json={"notes": "just notes"},
            headers=headers,
        )

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /applications/ — list
# ---------------------------------------------------------------------------


async def test_list_applications() -> None:
    """GET /applications/ returns a list with the expected shape."""
    await _ensure_db_ready()
    async with _client() as client:
        _, headers = await _get_auth(client)

        response = await client.get("/applications/", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    # Previous tests created at least one application
    assert len(body) >= 1
    assert "lead_id" in body[0]
    assert "stage" in body[0]
    assert "user_id" in body[0]
    assert "document_metadata" in body[0]


async def test_application_responses_include_accessible_document_metadata() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        viewer_id, viewer_headers = await _get_auth(client)
        _, shared_owner_id = await _create_user("SharedCountOwnerPass1!")
        _, hidden_owner_id = await _create_user("HiddenCountOwnerPass1!")
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=viewer_headers,
        )
        assert create_resp.status_code == 201, create_resp.text
        app_id = create_resp.json()["id"]

        owned_doc_id = await _create_document_via_db(
            viewer_id,
            kind="resume",
            title="Owned Resume",
        )
        shared_doc_id = await _create_document_via_db(
            shared_owner_id,
            kind="cover_letter",
            title="Shared Cover Letter",
        )
        hidden_doc_id = await _create_document_via_db(
            hidden_owner_id,
            kind="freeform",
            title="Hidden Notes",
        )

        async with session_context() as session:
            session.add(
                models.DocumentShare(
                    document_id=shared_doc_id,
                    shared_with_user_id=viewer_id,
                    shared_by_user_id=shared_owner_id,
                    role="viewer",
                )
            )
            session.add(
                models.DocumentXApplication(
                    application_id=UUID(app_id),
                    document_id=hidden_doc_id,
                )
            )
            await session.commit()

        for document_id in (owned_doc_id, shared_doc_id):
            attach_resp = await client.post(
                f"/applications/{app_id}/documents",
                json={"document_id": str(document_id)},
                headers=viewer_headers,
            )
            assert attach_resp.status_code == 201, attach_resp.text

        list_resp = await client.get("/applications/", headers=viewer_headers)
        detail_resp = await client.get(
            f"/applications/{app_id}", headers=viewer_headers
        )
        update_resp = await client.patch(
            f"/applications/{app_id}",
            json={"notes": "Count should stay in sync"},
            headers=viewer_headers,
        )

    assert list_resp.status_code == 200
    list_body = next(
        application for application in list_resp.json() if application["id"] == app_id
    )
    _assert_document_metadata(
        list_body,
        total_count=2,
        has_resume=True,
        has_cover_letter=True,
        kinds={"resume", "cover_letter"},
    )

    assert detail_resp.status_code == 200
    _assert_document_metadata(
        detail_resp.json(),
        total_count=2,
        has_resume=True,
        has_cover_letter=True,
        kinds={"resume", "cover_letter"},
    )

    assert update_resp.status_code == 200
    _assert_document_metadata(
        update_resp.json(),
        total_count=2,
        has_resume=True,
        has_cover_letter=True,
        kinds={"resume", "cover_letter"},
    )


async def test_list_applications_empty_for_new_user() -> None:
    """GET /applications/ returns empty list when user has no applications."""
    await _ensure_db_ready()
    async with _client() as client:
        # Need a fresh user — costs one login
        email, _ = await _create_user("app-empty-pass1!")
        headers = await _auth_headers(client, email, "app-empty-pass1!")

        response = await client.get("/applications/", headers=headers)

    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# GET /applications/{id} — detail
# ---------------------------------------------------------------------------


async def test_get_application_by_id() -> None:
    """GET /applications/{id} returns 200 with the correct application."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        response = await client.get(f"/applications/{app_id}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == app_id
    assert body["lead_id"] == str(lead_id)


async def test_get_application_not_found() -> None:
    """GET /applications/{id} with a non-existent id returns 404."""
    await _ensure_db_ready()
    async with _client() as client:
        _, headers = await _get_auth(client)

        response = await client.get(f"/applications/{uuid4()}", headers=headers)

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /applications/{id} — update
# ---------------------------------------------------------------------------


async def test_update_application_happy_path() -> None:
    """PATCH /applications/{id} updates fields and returns 200."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        response = await client.patch(
            f"/applications/{app_id}",
            json={"notes": "Updated notes", "next_step": "Follow up"},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["notes"] == "Updated notes"
    assert body["next_step"] == "Follow up"


async def test_update_application_stage_appends_history() -> None:
    """PATCH that changes stage appends to status_history."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        response = await client.patch(
            f"/applications/{app_id}",
            json={"stage": "screening"},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["stage"] == "screening"
    history = body.get("status_history", [])
    assert len(history) >= 2
    # Last entry should reflect the new stage
    last = history[-1]
    assert last["stage"] == "screening"
    assert last["outcome"] is None


@pytest.mark.parametrize(
    ("terminal_outcome", "outcome_reason"),
    [
        ("rejected", "Role closed internally"),
        ("withdrawn", "Accepted another offer"),
    ],
)
async def test_update_application_sets_outcome_reason_for_terminal_outcome(
    terminal_outcome: str,
    outcome_reason: str,
) -> None:
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        created = await _create_application_via_api(client, headers, lead_id)
        app_id = created["id"]

        response = await client.patch(
            f"/applications/{app_id}",
            json={"outcome": terminal_outcome, "outcome_reason": outcome_reason},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["outcome"] == terminal_outcome
    assert body["outcome_reason"] == outcome_reason


@pytest.mark.parametrize(
    ("terminal_outcome", "outcome_reason"),
    [
        ("rejected", "Need a hybrid schedule"),
        ("withdrawn", "Accepted another offer"),
    ],
)
async def test_update_application_allows_outcome_reason_on_closed_application_without_outcome_change(
    terminal_outcome: str,
    outcome_reason: str,
) -> None:
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        created = await _create_application_via_api(client, headers, lead_id)
        app_id = created["id"]

        close_response = await client.patch(
            f"/applications/{app_id}",
            json={"outcome": terminal_outcome},
            headers=headers,
        )
        assert close_response.status_code == 200, close_response.text

        response = await client.patch(
            f"/applications/{app_id}",
            json={"outcome_reason": outcome_reason},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["outcome"] == terminal_outcome
    assert body["outcome_reason"] == outcome_reason


async def test_update_application_rejects_outcome_reason_for_active_application() -> (
    None
):
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        created = await _create_application_via_api(client, headers, lead_id)
        app_id = created["id"]

        response = await client.patch(
            f"/applications/{app_id}",
            json={"outcome_reason": "No longer interested"},
            headers=headers,
        )

    assert response.status_code == 400
    assert "outcome_reason" in response.json()["detail"]


@pytest.mark.parametrize("terminal_outcome", ["rejected", "withdrawn"])
async def test_update_application_rejects_implicit_reopen_from_terminal_outcome(
    terminal_outcome: str,
) -> None:
    """Closed applications cannot move back to an active stage without reopen=true."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        created = await _create_application_via_api(client, headers, lead_id)
        app_id = created["id"]

        close_response = await client.patch(
            f"/applications/{app_id}",
            json={"outcome": terminal_outcome},
            headers=headers,
        )
        assert close_response.status_code == 200, close_response.text

        response = await client.patch(
            f"/applications/{app_id}",
            json={"stage": "screening"},
            headers=headers,
        )
        assert response.status_code == 400
        assert "reopen=true" in response.json()["detail"]

        get_response = await client.get(f"/applications/{app_id}", headers=headers)

    assert get_response.status_code == 200
    body = get_response.json()
    assert body["outcome"] == terminal_outcome
    history = body.get("status_history", [])
    assert len(history) == 2
    assert history[-1]["outcome"] == terminal_outcome


@pytest.mark.parametrize("terminal_outcome", ["rejected", "withdrawn"])
async def test_update_application_reopens_terminal_outcome_when_reopen_true(
    terminal_outcome: str,
) -> None:
    """reopen=true allows a terminal application to move back into an active stage."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        created = await _create_application_via_api(client, headers, lead_id)
        app_id = created["id"]

        close_response = await client.patch(
            f"/applications/{app_id}",
            json={
                "outcome": terminal_outcome,
                "outcome_reason": "Team paused hiring",
            },
            headers=headers,
        )
        assert close_response.status_code == 200, close_response.text

        response = await client.patch(
            f"/applications/{app_id}",
            json={"stage": "screening", "reopen": True},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["stage"] == "screening"
    assert body["outcome"] is None
    assert body["outcome_reason"] is None
    history = body.get("status_history", [])
    assert len(history) == 3
    # Last entry reflects the reopen to screening
    assert history[-1]["stage"] == "screening"
    assert history[-1]["outcome"] is None


async def test_update_application_not_found() -> None:
    """PATCH /applications/{id} with non-existent id returns 404."""
    await _ensure_db_ready()
    async with _client() as client:
        _, headers = await _get_auth(client)

        response = await client.patch(
            f"/applications/{uuid4()}",
            json={"notes": "nope"},
            headers=headers,
        )

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /applications/{id}
# ---------------------------------------------------------------------------


async def test_delete_application_happy_path() -> None:
    """DELETE /applications/{id} returns 204 and the resource is gone."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        del_resp = await client.delete(f"/applications/{app_id}", headers=headers)
        assert del_resp.status_code == 204

        # Confirm it is gone
        get_resp = await client.get(f"/applications/{app_id}", headers=headers)

    assert get_resp.status_code == 404


async def test_delete_application_not_found() -> None:
    """DELETE /applications/{id} with non-existent id returns 404."""
    await _ensure_db_ready()
    async with _client() as client:
        _, headers = await _get_auth(client)

        response = await client.delete(f"/applications/{uuid4()}", headers=headers)

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /applications/{id}/documents — document attachment listing
# ---------------------------------------------------------------------------


async def test_get_application_documents_empty() -> None:
    """GET /applications/{id}/documents returns empty list when none attached."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        response = await client.get(
            f"/applications/{app_id}/documents", headers=headers
        )

    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# POST /applications/{id}/documents — attach a document
# DELETE /applications/{id}/documents/{document_id} — detach
# ---------------------------------------------------------------------------


async def test_attach_and_detach_document() -> None:
    """POST then DELETE on the document-attachment sub-route works end-to-end."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        doc_id = await _create_document_via_db(uid)

        # Attach
        attach_resp = await client.post(
            f"/applications/{app_id}/documents",
            json={"document_id": str(doc_id)},
            headers=headers,
        )
        assert attach_resp.status_code == 201
        assert attach_resp.json()["id"] == str(doc_id)

        # List should include the document
        list_resp = await client.get(
            f"/applications/{app_id}/documents", headers=headers
        )
        assert list_resp.status_code == 200
        assert any(d["id"] == str(doc_id) for d in list_resp.json())

        # Detach
        detach_resp = await client.delete(
            f"/applications/{app_id}/documents/{doc_id}", headers=headers
        )
        assert detach_resp.status_code == 204

        # Confirm gone
        list_resp2 = await client.get(
            f"/applications/{app_id}/documents", headers=headers
        )
        assert not any(d["id"] == str(doc_id) for d in list_resp2.json())


async def test_attach_duplicate_document_returns_400() -> None:
    """Attaching the same document twice returns 400."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        doc_id = await _create_document_via_db(uid)

        first = await client.post(
            f"/applications/{app_id}/documents",
            json={"document_id": str(doc_id)},
            headers=headers,
        )
        assert first.status_code == 201

        second = await client.post(
            f"/applications/{app_id}/documents",
            json={"document_id": str(doc_id)},
            headers=headers,
        )

    assert second.status_code == 400
    assert "already attached" in second.json()["detail"].lower()


async def test_application_documents_include_shared_attachments() -> None:
    """GET /applications/{id}/documents includes shared documents attached by the caller."""
    await _ensure_db_ready()
    async with _client() as client:
        viewer_id, viewer_headers = await _get_auth(client)
        _, owner_id = await _create_user("SharedDocOwnerPass1!")
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=viewer_headers,
        )
        app_id = create_resp.json()["id"]

        shared_doc_id = await _create_versioned_document_via_db(
            owner_id,
            title="Shared Application Doc",
            content="Shared attachment body",
        )

        async with session_context() as session:
            session.add(
                models.DocumentShare(
                    document_id=shared_doc_id,
                    shared_with_user_id=viewer_id,
                    shared_by_user_id=owner_id,
                    role="viewer",
                )
            )
            await session.commit()

        attach_resp = await client.post(
            f"/applications/{app_id}/documents",
            json={"document_id": str(shared_doc_id)},
            headers=viewer_headers,
        )
        assert attach_resp.status_code == 201

        list_resp = await client.get(
            f"/applications/{app_id}/documents", headers=viewer_headers
        )

    assert list_resp.status_code == 200
    document_ids = {document["id"] for document in list_resp.json()}
    assert str(shared_doc_id) in document_ids


async def test_application_documents_exclude_inaccessible_other_user_attachments() -> (
    None
):
    """GET /applications/{id}/documents excludes attached documents the caller cannot access."""
    await _ensure_db_ready()
    async with _client() as client:
        owner_id, headers = await _get_auth(client)
        _, other_user_id = await _create_user("OtherOwnerPass1!")
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        owner_doc_id = await _create_document_via_db(owner_id)
        other_doc_id = await _create_document_via_db(other_user_id)

        attach_resp = await client.post(
            f"/applications/{app_id}/documents",
            json={"document_id": str(owner_doc_id)},
            headers=headers,
        )
        assert attach_resp.status_code == 201

        async with session_context() as session:
            session.add(
                models.DocumentXApplication(
                    application_id=UUID(app_id),
                    document_id=other_doc_id,
                )
            )
            await session.commit()

        list_resp = await client.get(
            f"/applications/{app_id}/documents", headers=headers
        )

    assert list_resp.status_code == 200
    document_ids = {document["id"] for document in list_resp.json()}
    assert str(owner_doc_id) in document_ids
    assert str(other_doc_id) not in document_ids


async def test_application_export_includes_shared_attached_documents() -> None:
    """GET /applications/{id}/export includes attached shared documents the caller can access."""
    await _ensure_db_ready()
    async with _client() as client:
        viewer_id, viewer_headers = await _get_auth(client)
        _, owner_id = await _create_user("SharedExportOwnerPass1!")
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=viewer_headers,
        )
        app_id = create_resp.json()["id"]

        shared_doc_id = await _create_versioned_document_via_db(
            owner_id,
            title="Shared Export Doc",
            content="Shared export body",
        )

        async with session_context() as session:
            session.add(
                models.DocumentShare(
                    document_id=shared_doc_id,
                    shared_with_user_id=viewer_id,
                    shared_by_user_id=owner_id,
                    role="viewer",
                )
            )
            await session.commit()

        attach_resp = await client.post(
            f"/applications/{app_id}/documents",
            json={"document_id": str(shared_doc_id)},
            headers=viewer_headers,
        )
        assert attach_resp.status_code == 201

        export_resp = await client.get(
            f"/applications/{app_id}/export",
            headers=viewer_headers,
        )

    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"] == "application/zip"

    body = b""
    async for chunk in export_resp.aiter_bytes():
        body += chunk

    import zipfile
    from io import BytesIO

    with zipfile.ZipFile(BytesIO(body)) as archive:
        assert "resumes/Shared Export Doc.pdf" in archive.namelist()


async def test_detach_document_not_attached_returns_404() -> None:
    """DELETE on a document not attached to the application returns 404."""
    await _ensure_db_ready()
    async with _client() as client:
        uid, headers = await _get_auth(client)
        lead_id = await _create_lead()

        create_resp = await client.post(
            "/applications/",
            json={"lead_id": str(lead_id), "stage": "applied"},
            headers=headers,
        )
        app_id = create_resp.json()["id"]

        response = await client.delete(
            f"/applications/{app_id}/documents/{uuid4()}",
            headers=headers,
        )

    assert response.status_code == 404
