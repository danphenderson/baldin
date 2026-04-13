import json
from collections.abc import Mapping
from typing import Any, Literal
from uuid import UUID

from app.core import conf
from app.logging import AsyncJSONFileLogger, console_log, get_async_logger

DbManagementOperation = Literal["purge_user_data", "delete_user"]
DbManagementBlockReason = Literal[
    "self_delete",
    "last_remaining_superuser",
]

_AUDIT_EVENT_NAME = "db_management_admin_operation"
_audit_log: AsyncJSONFileLogger | None = None


def _get_audit_logger() -> AsyncJSONFileLogger:
    global _audit_log
    if _audit_log is None:
        _audit_log = get_async_logger("db_management_audit")
    return _audit_log


def _normalize_deleted_records(deleted_records: Mapping[str, Any]) -> dict[str, int]:
    return {str(key): int(value) for key, value in deleted_records.items()}


async def _write_audit_record(
    *,
    level: Literal["info", "warning"],
    message: str,
    payload: Mapping[str, Any],
    logger: AsyncJSONFileLogger | None = None,
) -> None:
    if logger is None and not conf.settings.SHOULD_LOG_API_TO_FILE:
        getattr(console_log, level)(
            "db_management_audit %s",
            json.dumps(dict(payload), sort_keys=True, default=str),
        )
        return

    audit_logger = logger or _get_audit_logger()
    try:
        await getattr(audit_logger, level)(
            message,
            extra={"structured_data": dict(payload)},
        )
    except Exception:
        console_log.exception("Failed to write db-management audit log")


async def log_db_management_destructive_operation(
    *,
    operation: DbManagementOperation,
    actor_user_id: UUID | str,
    target_user_id: UUID | str,
    result: Mapping[str, Any],
    logger: AsyncJSONFileLogger | None = None,
) -> None:
    await _write_audit_record(
        level="info",
        message=f"db-management {operation} succeeded",
        payload={
            "event": _AUDIT_EVENT_NAME,
            "outcome": "succeeded",
            "operation": operation,
            "actor_user_id": str(actor_user_id),
            "target_user_id": str(target_user_id),
            "user_deleted": bool(result.get("user_deleted", False)),
            "domains": [str(domain) for domain in result.get("domains", [])],
            "cleared_profile_fields": int(result.get("cleared_profile_fields", 0)),
            "deleted_records": _normalize_deleted_records(
                result.get("deleted_records", {})
            ),
        },
        logger=logger,
    )


async def log_db_management_operation_blocked(
    *,
    operation: DbManagementOperation,
    actor_user_id: UUID | str,
    target_user_id: UUID | str,
    block_reason: DbManagementBlockReason,
    logger: AsyncJSONFileLogger | None = None,
) -> None:
    await _write_audit_record(
        level="warning",
        message=f"db-management {operation} blocked",
        payload={
            "event": _AUDIT_EVENT_NAME,
            "outcome": "blocked",
            "operation": operation,
            "actor_user_id": str(actor_user_id),
            "target_user_id": str(target_user_id),
            "block_reason": block_reason,
        },
        logger=logger,
    )


async def log_db_management_delete_blocked(
    *,
    actor_user_id: UUID | str,
    target_user_id: UUID | str,
    delete_block_reason: DbManagementBlockReason,
    logger: AsyncJSONFileLogger | None = None,
) -> None:
    await log_db_management_operation_blocked(
        operation="delete_user",
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        block_reason=delete_block_reason,
        logger=logger,
    )
