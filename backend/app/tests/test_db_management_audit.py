from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

import app.logging as app_logging
from app.api.routes import db_management as db_management_routes
from app.conftest import (
    async_client_ctx,
)
from app.conftest import (
    create_user as _create_user,
)
from app.conftest import (
    login_and_get_headers as _auth_headers,
)
from app.core import conf
from app.core.db_management_audit import (
    log_db_management_delete_blocked,
    log_db_management_destructive_operation,
)

pytestmark = pytest.mark.asyncio(loop_scope="module")


@pytest.fixture(scope="module", autouse=True)
async def _shared_db_ready(ensure_db: None) -> None:
    del ensure_db


async def _ensure_db_ready() -> None:
    return None


_client = async_client_ctx


def _make_temp_logger(monkeypatch, tmp_path, label: str):
    base_config = conf.settings.model_dump()
    dev_settings = conf.get_settings(
        **(
            base_config
            | {
                "ENVIRONMENT": "DEV",
                "PUBLIC_ASSETS_DIR": str(tmp_path),
            }
        )
    )
    monkeypatch.setattr(conf, "settings", dev_settings)
    monkeypatch.setattr(app_logging.conf, "settings", dev_settings)
    return app_logging.get_async_logger(f"test.{label}.{uuid4().hex}")


async def test_log_db_management_destructive_operation_writes_structured_entry(
    monkeypatch,
    tmp_path,
) -> None:
    logger = _make_temp_logger(
        monkeypatch,
        tmp_path,
        "db_management_audit_success",
    )

    await log_db_management_destructive_operation(
        operation="purge_user_data",
        actor_user_id=uuid4(),
        target_user_id=uuid4(),
        result={
            "user_deleted": False,
            "cleared_profile_fields": 3,
            "deleted_records": {"documents": 2, "applications": 1},
        },
        logger=logger,
    )

    records = await logger.read()

    assert len(records) == 1
    assert records[0]["message"] == "db-management purge_user_data succeeded"
    assert records[0]["event"] == "db_management_admin_operation"
    assert records[0]["outcome"] == "succeeded"
    assert records[0]["operation"] == "purge_user_data"
    assert records[0]["user_deleted"] is False
    assert records[0]["domains"] == []
    assert records[0]["cleared_profile_fields"] == 3
    assert records[0]["deleted_records"] == {"documents": 2, "applications": 1}


async def test_log_db_management_delete_blocked_writes_structured_entry(
    monkeypatch,
    tmp_path,
) -> None:
    logger = _make_temp_logger(
        monkeypatch,
        tmp_path,
        "db_management_audit_blocked",
    )

    await log_db_management_delete_blocked(
        actor_user_id=uuid4(),
        target_user_id=uuid4(),
        delete_block_reason="self_delete",
        logger=logger,
    )

    records = await logger.read()

    assert len(records) == 1
    assert records[0]["message"] == "db-management delete_user blocked"
    assert records[0]["event"] == "db_management_admin_operation"
    assert records[0]["outcome"] == "blocked"
    assert records[0]["operation"] == "delete_user"
    assert records[0]["block_reason"] == "self_delete"


async def test_db_management_purge_logs_successful_audit_event(monkeypatch) -> None:
    await _ensure_db_ready()
    audit_mock = AsyncMock()
    monkeypatch.setattr(
        db_management_routes,
        "log_db_management_destructive_operation",
        audit_mock,
    )
    purge_result = {
        "user_id": str(uuid4()),
        "domains": [
            "profile",
            "leads",
            "applications",
            "documents",
            "agents",
            "extractors",
            "orchestration",
        ],
        "cleared_profile_fields": 0,
        "deleted_records": {"documents": 1},
        "user_deleted": False,
    }

    class _FakeManager:
        def __init__(self, session):
            self.session = session

        async def purge_user_data(self, user_id, current_superuser_id, domains=None):
            return purge_result

    monkeypatch.setattr(db_management_routes, "DataBaseManager", _FakeManager)

    async with _client() as client:
        admin_password = "audit-purge-admin-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password,
            email="audit-purge-admin@example.com",
            is_superuser=True,
        )
        _, target_user_id = await _create_user(
            "audit-purge-target-pass",
            email="audit-purge-target@example.com",
        )
        headers = await _auth_headers(client, admin_email, admin_password)

        response = await client.patch(
            f"/api/v1/db-management/users/{target_user_id}/purge",
            headers=headers,
        )

    assert response.status_code == 200
    audit_mock.assert_awaited_once()
    audit_call = audit_mock.await_args.kwargs
    assert audit_call["operation"] == "purge_user_data"
    assert audit_call["actor_user_id"] == admin_user_id
    assert audit_call["target_user_id"] == target_user_id
    assert audit_call["result"]["user_deleted"] is False
    assert audit_call["result"]["deleted_records"]["documents"] == 1


async def test_db_management_delete_logs_successful_audit_event(monkeypatch) -> None:
    await _ensure_db_ready()
    audit_mock = AsyncMock()
    monkeypatch.setattr(
        db_management_routes,
        "log_db_management_destructive_operation",
        audit_mock,
    )
    delete_result = {
        "user_id": str(uuid4()),
        "domains": [
            "profile",
            "leads",
            "applications",
            "documents",
            "agents",
            "extractors",
            "orchestration",
        ],
        "cleared_profile_fields": 0,
        "deleted_records": {"documents": 1},
        "user_deleted": True,
    }

    class _FakeManager:
        def __init__(self, session):
            self.session = session

        async def get_delete_block_reason(self, target_user, current_superuser_id):
            return None

        async def delete_user(self, user_id):
            return delete_result

    monkeypatch.setattr(db_management_routes, "DataBaseManager", _FakeManager)

    async with _client() as client:
        admin_password = "audit-delete-admin-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password,
            email="audit-delete-admin@example.com",
            is_superuser=True,
        )
        _, target_user_id = await _create_user(
            "audit-delete-target-pass",
            email="audit-delete-target@example.com",
        )
        headers = await _auth_headers(client, admin_email, admin_password)

        response = await client.delete(
            f"/api/v1/db-management/users/{target_user_id}",
            headers=headers,
        )

    assert response.status_code == 200
    audit_mock.assert_awaited_once()
    audit_call = audit_mock.await_args.kwargs
    assert audit_call["operation"] == "delete_user"
    assert audit_call["actor_user_id"] == admin_user_id
    assert audit_call["target_user_id"] == target_user_id
    assert audit_call["result"]["user_deleted"] is True
    assert audit_call["result"]["deleted_records"]["documents"] == 1


async def test_db_management_delete_logs_blocked_audit_event(monkeypatch) -> None:
    await _ensure_db_ready()
    blocked_mock = AsyncMock()
    success_mock = AsyncMock()
    delete_user_mock = AsyncMock()
    monkeypatch.setattr(
        db_management_routes,
        "log_db_management_delete_blocked",
        blocked_mock,
    )
    monkeypatch.setattr(
        db_management_routes,
        "log_db_management_destructive_operation",
        success_mock,
    )

    class _FakeManager:
        def __init__(self, session):
            self.session = session

        async def get_delete_block_reason(self, target_user, current_superuser_id):
            return "self_delete"

        async def delete_user(self, user_id):
            return await delete_user_mock(user_id)

    monkeypatch.setattr(db_management_routes, "DataBaseManager", _FakeManager)

    async with _client() as client:
        admin_password = "audit-blocked-admin-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password,
            email="audit-blocked-admin@example.com",
            is_superuser=True,
        )
        headers = await _auth_headers(client, admin_email, admin_password)

        response = await client.delete(
            f"/api/v1/db-management/users/{admin_user_id}",
            headers=headers,
        )

    assert response.status_code == 409
    blocked_mock.assert_awaited_once()
    blocked_call = blocked_mock.await_args.kwargs
    assert blocked_call["actor_user_id"] == admin_user_id
    assert blocked_call["target_user_id"] == admin_user_id
    assert blocked_call["delete_block_reason"] == "self_delete"
    success_mock.assert_not_awaited()
    delete_user_mock.assert_not_awaited()


async def test_db_management_purge_logs_blocked_audit_event(monkeypatch) -> None:
    await _ensure_db_ready()
    blocked_mock = AsyncMock()
    success_mock = AsyncMock()
    purge_mock = AsyncMock(side_effect=ValueError("self_delete"))
    monkeypatch.setattr(
        db_management_routes,
        "log_db_management_operation_blocked",
        blocked_mock,
    )
    monkeypatch.setattr(
        db_management_routes,
        "log_db_management_destructive_operation",
        success_mock,
    )

    class _FakeManager:
        def __init__(self, session):
            self.session = session

        async def purge_user_data(self, user_id, current_superuser_id, domains=None):
            return await purge_mock(user_id, current_superuser_id, domains)

    monkeypatch.setattr(db_management_routes, "DataBaseManager", _FakeManager)

    async with _client() as client:
        admin_password = "audit-blocked-purge-admin-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password,
            email="audit-blocked-purge-admin@example.com",
            is_superuser=True,
        )
        headers = await _auth_headers(client, admin_email, admin_password)

        response = await client.patch(
            f"/api/v1/db-management/users/{admin_user_id}/purge",
            headers=headers,
        )

    assert response.status_code == 409
    blocked_mock.assert_awaited_once()
    blocked_call = blocked_mock.await_args.kwargs
    assert blocked_call["operation"] == "purge_user_data"
    assert blocked_call["actor_user_id"] == admin_user_id
    assert blocked_call["target_user_id"] == admin_user_id
    assert blocked_call["block_reason"] == "self_delete"
    success_mock.assert_not_awaited()
