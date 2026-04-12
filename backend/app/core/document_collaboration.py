import asyncio
import json
import time
from collections import defaultdict
from contextlib import suppress
from dataclasses import dataclass
from enum import Enum
from logging import getLogger
from math import ceil
from typing import AsyncIterator

import y_py as Y
from fastapi import WebSocket
from ypy_websocket import WebsocketServer, YRoom
from ypy_websocket.ystore import BaseYStore

from app.core.db import async_session_maker
from app.core.document_blocks import block_snapshot_to_tiptap_json
from app.models import Document

log = getLogger(__name__)

_document_state_locks: defaultdict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
_document_bootstrap_claims: dict[str, float] = {}
_DOCUMENT_COLLABORATION_BOOTSTRAP_LEASE_SECONDS = 15.0
_DOCUMENT_COLLABORATION_BOOTSTRAP_PENDING_RETRY_MIN_MS = 100
_DOCUMENT_COLLABORATION_BOOTSTRAP_PENDING_RETRY_MAX_MS = 1000


class DocumentCollaborationBootstrapClaimStatus(str, Enum):
    CONNECT = "connect"
    PENDING = "pending"
    SEED = "seed"


@dataclass(frozen=True)
class DocumentCollaborationBootstrapClaimResult:
    status: DocumentCollaborationBootstrapClaimStatus
    content: str | None = None
    retry_after_ms: int | None = None


def _is_seedable_tiptap_document(content: str | None) -> bool:
    if not content or not content.strip():
        return False

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return False

    return isinstance(parsed, dict) and parsed.get("type") == "doc"


def _seedable_head_version_content(document: Document) -> str | None:
    head_version = document.head_version
    if head_version is None or head_version.content_format != "tiptap_json":
        return None

    if head_version.block_snapshot is not None:
        try:
            return json.dumps(
                block_snapshot_to_tiptap_json(
                    document.id,
                    head_version.block_snapshot,
                )
            )
        except ValueError:
            return head_version.content

    return head_version.content


def _merge_document_state(
    existing_state: bytes | bytearray | memoryview | None,
    incoming_update: bytes,
) -> bytes:
    ydoc = Y.YDoc()
    if existing_state:
        Y.apply_update(ydoc, bytes(existing_state))
    Y.apply_update(ydoc, incoming_update)
    return Y.encode_state_as_update(ydoc)


def _clear_document_bootstrap_claim(document_id: str) -> None:
    _document_bootstrap_claims.pop(document_id, None)


def _get_pending_bootstrap_retry_after_ms(
    claim_expires_at: float,
    now: float,
) -> int:
    remaining_lease_ms = ceil((claim_expires_at - now) * 1000)
    return max(
        _DOCUMENT_COLLABORATION_BOOTSTRAP_PENDING_RETRY_MIN_MS,
        min(
            remaining_lease_ms,
            _DOCUMENT_COLLABORATION_BOOTSTRAP_PENDING_RETRY_MAX_MS,
        ),
    )


async def claim_document_collaboration_bootstrap(
    document_id: str,
) -> DocumentCollaborationBootstrapClaimResult:
    async with _document_state_locks[document_id]:
        async with async_session_maker() as session:
            document = await session.get(Document, document_id)
            if document is None:
                _clear_document_bootstrap_claim(document_id)
                return DocumentCollaborationBootstrapClaimResult(
                    status=DocumentCollaborationBootstrapClaimStatus.CONNECT
                )

            if document.yjs_state:
                _clear_document_bootstrap_claim(document_id)
                return DocumentCollaborationBootstrapClaimResult(
                    status=DocumentCollaborationBootstrapClaimStatus.CONNECT
                )

            seed_content = _seedable_head_version_content(document)
            if not _is_seedable_tiptap_document(seed_content):
                _clear_document_bootstrap_claim(document_id)
                return DocumentCollaborationBootstrapClaimResult(
                    status=DocumentCollaborationBootstrapClaimStatus.CONNECT
                )

            now = time.monotonic()
            claim_expires_at = _document_bootstrap_claims.get(document_id)
            if claim_expires_at is not None and claim_expires_at > now:
                return DocumentCollaborationBootstrapClaimResult(
                    status=DocumentCollaborationBootstrapClaimStatus.PENDING,
                    retry_after_ms=_get_pending_bootstrap_retry_after_ms(
                        claim_expires_at,
                        now,
                    ),
                )

            _document_bootstrap_claims[document_id] = (
                now + _DOCUMENT_COLLABORATION_BOOTSTRAP_LEASE_SECONDS
            )
            return DocumentCollaborationBootstrapClaimResult(
                status=DocumentCollaborationBootstrapClaimStatus.SEED,
                content=seed_content,
            )


class DocumentYStore(BaseYStore):
    def __init__(self, path: str, metadata_callback=None, log=None):
        self.path = path
        self.metadata_callback = metadata_callback
        self.log = log or getLogger(__name__)
        self._write_lock = _document_state_locks[path]

    async def write(self, data: bytes) -> None:
        async with self._write_lock:
            async with async_session_maker() as session:
                document = await session.get(Document, self.path)
                if document is None:
                    _clear_document_bootstrap_claim(self.path)
                    self.log.warning(
                        "Skipping collaboration state write for missing document %s",
                        self.path,
                    )
                    return

                document.yjs_state = _merge_document_state(document.yjs_state, data)
                await session.commit()
                _clear_document_bootstrap_claim(self.path)

    async def read(self) -> AsyncIterator[tuple[bytes, bytes]]:
        async with async_session_maker() as session:
            document = await session.get(Document, self.path)
            if document is None or document.yjs_state is None:
                return

            yield bytes(document.yjs_state), b""


class FastAPIWebsocketAdapter:
    def __init__(self, websocket: WebSocket, path: str):
        self._websocket = websocket
        self._path = path

    @property
    def path(self) -> str:
        return self._path

    async def send(self, message: bytes) -> None:
        await self._websocket.send_bytes(message)

    async def recv(self) -> bytes:
        return await self._websocket.receive_bytes()


class DocumentCollaborationServer(WebsocketServer):
    def __init__(self):
        super().__init__(rooms_ready=True, auto_clean_rooms=True, log=log)
        self._room_locks: defaultdict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def get_room(self, name: str) -> YRoom:
        if name not in self.rooms:
            async with self._room_locks[name]:
                if name not in self.rooms:
                    ystore = DocumentYStore(name, log=self.log)
                    room = YRoom(ready=False, ystore=ystore, log=self.log)
                    await ystore.apply_updates(room.ydoc)
                    room.ready = True
                    self.rooms[name] = room

        room = self.rooms[name]
        await self.start_room(room)
        return room

    def delete_room(self, *, name=None, room=None) -> None:
        room_name = name or self.get_room_name(room)
        super().delete_room(name=name, room=room)
        self._room_locks.pop(room_name, None)


document_collaboration_server = DocumentCollaborationServer()
_document_collaboration_server_task: asyncio.Task[None] | None = None
_document_collaboration_server_lock = asyncio.Lock()


async def ensure_document_collaboration_server_started() -> None:
    global _document_collaboration_server_task

    async with _document_collaboration_server_lock:
        if (
            _document_collaboration_server_task is not None
            and not _document_collaboration_server_task.done()
        ):
            return

        _document_collaboration_server_task = asyncio.create_task(
            document_collaboration_server.start()
        )
        await document_collaboration_server.started.wait()


async def stop_document_collaboration_server() -> None:
    global _document_collaboration_server_task

    async with _document_collaboration_server_lock:
        if _document_collaboration_server_task is None:
            return

        if not _document_collaboration_server_task.done():
            document_collaboration_server.stop()

        with suppress(asyncio.CancelledError):
            await _document_collaboration_server_task

        document_collaboration_server.rooms.clear()
        _document_collaboration_server_task = None
