from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Mapping, Sequence
from uuid import UUID, uuid4

from app import models

BlockPath = tuple[int, ...]
PreserveIdMap = Mapping[BlockPath, UUID | str]

_ROOT_BLOCK_TYPES = frozenset(
    {
        "paragraph",
        "heading",
        "bullet_list",
        "ordered_list",
        "task_list",
        "blockquote",
        "code_block",
        "callout",
        "toggle",
        "table",
        "divider",
        "mention",
        "embed",
    }
)

_NESTABLE_BLOCK_TYPES = frozenset(_ROOT_BLOCK_TYPES - {"mention", "embed"})

_CHILD_BLOCK_TYPES_BY_PARENT = {
    "paragraph": frozenset(),
    "heading": frozenset(),
    "bullet_list": frozenset({"list_item"}),
    "ordered_list": frozenset({"list_item"}),
    "list_item": _NESTABLE_BLOCK_TYPES,
    "task_list": frozenset({"task_item"}),
    "task_item": _NESTABLE_BLOCK_TYPES,
    "blockquote": _NESTABLE_BLOCK_TYPES,
    "code_block": frozenset(),
    "callout": _NESTABLE_BLOCK_TYPES,
    "toggle": _NESTABLE_BLOCK_TYPES,
    "table": frozenset({"table_row"}),
    "table_row": frozenset({"table_cell"}),
    "table_cell": _NESTABLE_BLOCK_TYPES,
    "divider": frozenset(),
    "mention": frozenset(),
    "embed": frozenset(),
}

_BLOCK_NODE_TYPES = {
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "listItem",
    "taskList",
    "taskItem",
    "blockquote",
    "codeBlock",
    "callout",
    "details",
    "table",
    "tableRow",
    "tableCell",
    "tableHeader",
    "horizontalRule",
    "mentionBlock",
    "embedBlock",
}


@dataclass(frozen=True)
class BlockSyncDelta:
    added_block_ids: set[UUID]
    removed_block_ids: set[UUID]
    updated_block_ids: set[UUID]
    moved_block_ids: set[UUID]
    touched_parent_ids: set[UUID | None]

    @property
    def changed_block_ids(self) -> set[UUID]:
        return (
            set(self.added_block_ids)
            | set(self.removed_block_ids)
            | set(self.updated_block_ids)
            | set(self.moved_block_ids)
        )


def blocks_to_tiptap_json(
    blocks: Sequence[models.DocumentBlock],
) -> dict[str, Any]:
    block_list = list(blocks)
    children_by_parent: dict[UUID | None, list[models.DocumentBlock]] = defaultdict(
        list
    )
    block_ids: set[UUID] = set()

    for block in block_list:
        if block.id is None:
            raise ValueError(
                "Document blocks must have stable UUIDs before serialization"
            )
        block_ids.add(block.id)

    for block in block_list:
        parent_id = block.parent_block_id
        if parent_id is not None and parent_id not in block_ids:
            parent_id = None
        children_by_parent[parent_id].append(block)

    for sibling_list in children_by_parent.values():
        sibling_list.sort(key=lambda block: (block.position, str(block.id)))

    return {
        "type": "doc",
        "content": [
            _block_to_tiptap_node(block, children_by_parent)
            for block in children_by_parent[None]
        ],
    }


def block_ids_by_tiptap_path(
    blocks: Sequence[models.DocumentBlock],
) -> dict[BlockPath, UUID]:
    block_list = list(blocks)
    children_by_parent: dict[UUID | None, list[models.DocumentBlock]] = defaultdict(
        list
    )
    block_ids: set[UUID] = set()

    for block in block_list:
        if block.id is None:
            raise ValueError(
                "Document blocks must have stable UUIDs before path mapping"
            )
        block_ids.add(block.id)

    for block in block_list:
        parent_id = block.parent_block_id
        if parent_id is not None and parent_id not in block_ids:
            parent_id = None
        children_by_parent[parent_id].append(block)

    for sibling_list in children_by_parent.values():
        sibling_list.sort(key=lambda block: (block.position, str(block.id)))

    mapping: dict[BlockPath, UUID] = {}
    for index, block in enumerate(children_by_parent[None]):
        _collect_block_paths(
            block=block,
            path=(index,),
            children_by_parent=children_by_parent,
            mapping=mapping,
        )
    return mapping


def blocks_to_block_snapshot(
    blocks: Sequence[models.DocumentBlock],
) -> list[dict[str, Any]]:
    block_list = list(blocks)
    children_by_parent: dict[UUID | None, list[models.DocumentBlock]] = defaultdict(
        list
    )
    block_ids: set[UUID] = set()

    for block in block_list:
        if block.id is None:
            raise ValueError(
                "Document blocks must have stable UUIDs before snapshot serialization"
            )
        block_ids.add(block.id)

    for block in block_list:
        parent_id = block.parent_block_id
        if parent_id is not None and parent_id not in block_ids:
            parent_id = None
        children_by_parent[parent_id].append(block)

    for sibling_list in children_by_parent.values():
        sibling_list.sort(key=lambda block: (block.position, str(block.id)))

    return [
        _block_to_snapshot(block, children_by_parent)
        for block in children_by_parent[None]
    ]


def block_snapshot_to_blocks(
    document_id: UUID,
    snapshot: Sequence[dict[str, Any]],
) -> list[models.DocumentBlock]:
    if not isinstance(snapshot, Sequence) or isinstance(
        snapshot, (str, bytes, bytearray)
    ):
        raise ValueError("Block snapshot must be a list")

    blocks: list[models.DocumentBlock] = []
    seen_ids: set[UUID] = set()
    for index, raw_block in enumerate(snapshot):
        blocks.extend(
            _snapshot_entry_to_blocks(
                document_id=document_id,
                raw_block=raw_block,
                parent_block_id=None,
                default_position=index,
                seen_ids=seen_ids,
            )
        )
    return blocks


def block_snapshot_to_tiptap_json(
    document_id: UUID,
    snapshot: Sequence[dict[str, Any]],
) -> dict[str, Any]:
    return blocks_to_tiptap_json(block_snapshot_to_blocks(document_id, snapshot))


def compute_block_sync_delta(
    existing: Sequence[models.DocumentBlock],
    incoming: Sequence[models.DocumentBlock],
) -> BlockSyncDelta:
    existing_by_id = {block.id: block for block in existing if block.id is not None}
    incoming_by_id = {block.id: block for block in incoming if block.id is not None}

    added_block_ids = set(incoming_by_id) - set(existing_by_id)
    removed_block_ids = set(existing_by_id) - set(incoming_by_id)
    updated_block_ids: set[UUID] = set()
    moved_block_ids: set[UUID] = set()
    touched_parent_ids: set[UUID | None] = set()

    for block_id in set(existing_by_id) & set(incoming_by_id):
        previous = existing_by_id[block_id]
        current = incoming_by_id[block_id]
        if (
            previous.block_type != current.block_type
            or previous.content != current.content
            or (previous.properties or {}) != (current.properties or {})
        ):
            updated_block_ids.add(block_id)
        if (
            previous.parent_block_id != current.parent_block_id
            or previous.position != current.position
        ):
            moved_block_ids.add(block_id)
            touched_parent_ids.add(previous.parent_block_id)
            touched_parent_ids.add(current.parent_block_id)

    for block_id in added_block_ids:
        touched_parent_ids.add(incoming_by_id[block_id].parent_block_id)
    for block_id in removed_block_ids:
        touched_parent_ids.add(existing_by_id[block_id].parent_block_id)

    return BlockSyncDelta(
        added_block_ids=added_block_ids,
        removed_block_ids=removed_block_ids,
        updated_block_ids=updated_block_ids,
        moved_block_ids=moved_block_ids,
        touched_parent_ids=touched_parent_ids,
    )


def validate_block_tree(
    blocks: Sequence[models.DocumentBlock],
) -> None:
    block_list = list(blocks)
    block_by_id: dict[UUID, models.DocumentBlock] = {}

    for block in block_list:
        if block.id is None:
            raise ValueError("Document blocks must have stable UUIDs before validation")
        if block.id in block_by_id:
            raise ValueError("Document blocks must have unique UUIDs")
        if block.block_type not in _CHILD_BLOCK_TYPES_BY_PARENT:
            raise ValueError(f"Unsupported block type: {block.block_type}")
        block_by_id[block.id] = block

    for block in block_list:
        parent_block = None
        if block.parent_block_id is not None:
            parent_block = block_by_id.get(block.parent_block_id)
            if parent_block is None:
                raise ValueError("Parent block not found")
            if parent_block.id == block.id:
                raise ValueError("Document blocks cannot parent themselves")

        allowed_types = (
            _ROOT_BLOCK_TYPES
            if parent_block is None
            else _CHILD_BLOCK_TYPES_BY_PARENT[parent_block.block_type]
        )
        if block.block_type not in allowed_types:
            if parent_block is None:
                raise ValueError(
                    f"Block type {block.block_type} cannot be placed at the document root"
                )
            raise ValueError(
                f"Block type {block.block_type} cannot be placed beneath {parent_block.block_type}"
            )

        _ensure_acyclic_parent_chain(block, block_by_id)


def tiptap_json_to_blocks(
    document_id: UUID,
    tiptap_json: dict[str, Any],
    preserve_ids: PreserveIdMap | None = None,
) -> list[models.DocumentBlock]:
    if not isinstance(tiptap_json, dict) or tiptap_json.get("type") != "doc":
        raise ValueError("TipTap JSON must be a document node")

    root_children = _as_node_list(tiptap_json.get("content"))
    blocks: list[models.DocumentBlock] = []
    for index, node in enumerate(root_children):
        blocks.extend(
            _tiptap_node_to_blocks(
                document_id=document_id,
                node=node,
                parent_block_id=None,
                position=index,
                path=(index,),
                preserve_ids=preserve_ids,
            )
        )
    return blocks


def _block_to_tiptap_node(
    block: models.DocumentBlock,
    children_by_parent: Mapping[UUID | None, list[models.DocumentBlock]],
) -> dict[str, Any]:
    children = [
        _block_to_tiptap_node(child, children_by_parent)
        for child in children_by_parent.get(block.id, [])
    ]
    attrs = _attrs_with_block_id(block)
    inline_content = _copy_inline_content(block.content)

    if block.block_type == "paragraph":
        return _build_inline_node("paragraph", inline_content, attrs)
    if block.block_type == "heading":
        return _build_inline_node("heading", inline_content, attrs)
    if block.block_type == "bullet_list":
        return _build_structural_node("bulletList", children, attrs)
    if block.block_type == "ordered_list":
        return _build_structural_node("orderedList", children, attrs)
    if block.block_type == "list_item":
        return _build_wrapped_node("listItem", inline_content, children, attrs)
    if block.block_type == "task_list":
        return _build_structural_node("taskList", children, attrs)
    if block.block_type == "task_item":
        return _build_wrapped_node("taskItem", inline_content, children, attrs)
    if block.block_type == "blockquote":
        return _build_wrapped_node("blockquote", inline_content, children, attrs)
    if block.block_type == "code_block":
        return _build_inline_node("codeBlock", inline_content, attrs)
    if block.block_type == "callout":
        return _build_wrapped_node("callout", inline_content, children, attrs)
    if block.block_type == "toggle":
        return _build_toggle_node(inline_content, children, attrs)
    if block.block_type == "table":
        return _build_structural_node("table", children, attrs)
    if block.block_type == "table_row":
        return _build_structural_node("tableRow", children, attrs)
    if block.block_type == "table_cell":
        node_type = (
            "tableHeader"
            if bool((block.properties or {}).get("header"))
            else "tableCell"
        )
        return _build_wrapped_node(node_type, inline_content, children, attrs)
    if block.block_type == "divider":
        return _build_structural_node("horizontalRule", [], attrs)
    if block.block_type == "mention":
        return _build_atomic_node("mentionBlock", attrs)
    if block.block_type == "embed":
        return _build_atomic_node("embedBlock", attrs)

    raise ValueError(f"Unsupported block type: {block.block_type}")


def _block_to_snapshot(
    block: models.DocumentBlock,
    children_by_parent: Mapping[UUID | None, list[models.DocumentBlock]],
) -> dict[str, Any]:
    if block.id is None:
        raise ValueError(
            "Document blocks must have stable UUIDs before snapshot serialization"
        )

    return {
        "id": str(block.id),
        "block_type": block.block_type,
        "content": deepcopy(block.content),
        "properties": deepcopy(block.properties or {}),
        "position": block.position,
        "children": [
            _block_to_snapshot(child, children_by_parent)
            for child in children_by_parent.get(block.id, [])
        ],
    }


def _snapshot_entry_to_blocks(
    *,
    document_id: UUID,
    raw_block: dict[str, Any],
    parent_block_id: UUID | None,
    default_position: int,
    seen_ids: set[UUID],
) -> list[models.DocumentBlock]:
    if not isinstance(raw_block, dict):
        raise ValueError("Block snapshot entries must be objects")

    raw_id = raw_block.get("id")
    if raw_id is None:
        raise ValueError("Block snapshot entries must include an id")

    try:
        block_id = raw_id if isinstance(raw_id, UUID) else UUID(str(raw_id))
    except (TypeError, ValueError) as exc:
        raise ValueError("Block snapshot ids must be valid UUIDs") from exc

    if block_id in seen_ids:
        raise ValueError("Block snapshot contains duplicate ids")
    seen_ids.add(block_id)

    block_type = raw_block.get("block_type")
    if not isinstance(block_type, str) or not block_type:
        raise ValueError("Block snapshot entries must include a block_type")

    raw_position = raw_block.get("position", default_position)
    if not isinstance(raw_position, int) or raw_position < 0:
        raise ValueError("Block snapshot positions must be non-negative integers")

    properties = raw_block.get("properties")
    if properties is None:
        properties = {}
    if not isinstance(properties, dict):
        raise ValueError("Block snapshot properties must be an object")

    block = models.DocumentBlock(
        id=block_id,
        document_id=document_id,
        parent_block_id=parent_block_id,
        block_type=block_type,
        content=deepcopy(raw_block.get("content")),
        properties=deepcopy(properties),
        position=raw_position,
    )
    blocks = [block]

    raw_children = raw_block.get("children")
    if raw_children is None:
        raw_children = []
    if not isinstance(raw_children, list):
        raise ValueError("Block snapshot children must be a list")

    for child_index, child in enumerate(raw_children):
        blocks.extend(
            _snapshot_entry_to_blocks(
                document_id=document_id,
                raw_block=child,
                parent_block_id=block.id,
                default_position=child_index,
                seen_ids=seen_ids,
            )
        )

    return blocks


def _collect_block_paths(
    *,
    block: models.DocumentBlock,
    path: BlockPath,
    children_by_parent: Mapping[UUID | None, list[models.DocumentBlock]],
    mapping: dict[BlockPath, UUID],
) -> None:
    assert block.id is not None
    mapping[path] = block.id

    for index, child in enumerate(children_by_parent.get(block.id, [])):
        _collect_block_paths(
            block=child,
            path=path + _serialized_child_path_suffix(block.block_type, index),
            children_by_parent=children_by_parent,
            mapping=mapping,
        )


def _serialized_child_path_suffix(block_type: str, child_index: int) -> BlockPath:
    if block_type == "toggle":
        return (1, child_index)
    if block_type in {
        "list_item",
        "task_item",
        "blockquote",
        "callout",
        "table_cell",
    }:
        return (child_index + 1,)
    return (child_index,)


def _tiptap_node_to_blocks(
    *,
    document_id: UUID,
    node: dict[str, Any],
    parent_block_id: UUID | None,
    position: int,
    path: BlockPath,
    preserve_ids: PreserveIdMap | None,
) -> list[models.DocumentBlock]:
    node_type = _node_type(node)
    attrs = _copy_dict(node.get("attrs"))
    explicit_block_id = _pop_explicit_block_id(attrs)

    if node_type == "paragraph":
        return [
            _build_block(
                document_id=document_id,
                parent_block_id=parent_block_id,
                block_type="paragraph",
                content=_copy_inline_content(node.get("content")),
                properties=attrs,
                position=position,
                path=path,
                explicit_block_id=explicit_block_id,
                preserve_ids=preserve_ids,
            )
        ]

    if node_type == "heading":
        return [
            _build_block(
                document_id=document_id,
                parent_block_id=parent_block_id,
                block_type="heading",
                content=_copy_inline_content(node.get("content")),
                properties=attrs,
                position=position,
                path=path,
                explicit_block_id=explicit_block_id,
                preserve_ids=preserve_ids,
            )
        ]

    if node_type == "bulletList":
        return _build_structural_blocks_from_node(
            document_id=document_id,
            node=node,
            node_block_type="bullet_list",
            parent_block_id=parent_block_id,
            position=position,
            path=path,
            properties=attrs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type == "orderedList":
        return _build_structural_blocks_from_node(
            document_id=document_id,
            node=node,
            node_block_type="ordered_list",
            parent_block_id=parent_block_id,
            position=position,
            path=path,
            properties=attrs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type == "listItem":
        inline_content, child_refs = _split_wrapped_children(node.get("content"))
        return _build_container_blocks_from_children(
            document_id=document_id,
            parent_block_id=parent_block_id,
            block_type="list_item",
            content=inline_content,
            properties=attrs,
            position=position,
            path=path,
            child_refs=child_refs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type == "taskList":
        return _build_structural_blocks_from_node(
            document_id=document_id,
            node=node,
            node_block_type="task_list",
            parent_block_id=parent_block_id,
            position=position,
            path=path,
            properties=attrs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type == "taskItem":
        inline_content, child_refs = _split_wrapped_children(node.get("content"))
        return _build_container_blocks_from_children(
            document_id=document_id,
            parent_block_id=parent_block_id,
            block_type="task_item",
            content=inline_content,
            properties=attrs,
            position=position,
            path=path,
            child_refs=child_refs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type == "blockquote":
        inline_content, child_refs = _split_wrapped_children(node.get("content"))
        return _build_container_blocks_from_children(
            document_id=document_id,
            parent_block_id=parent_block_id,
            block_type="blockquote",
            content=inline_content,
            properties=attrs,
            position=position,
            path=path,
            child_refs=child_refs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type == "codeBlock":
        return [
            _build_block(
                document_id=document_id,
                parent_block_id=parent_block_id,
                block_type="code_block",
                content=_copy_inline_content(node.get("content")),
                properties=attrs,
                position=position,
                path=path,
                explicit_block_id=explicit_block_id,
                preserve_ids=preserve_ids,
            )
        ]

    if node_type == "callout":
        inline_content, child_refs = _split_wrapped_children(node.get("content"))
        return _build_container_blocks_from_children(
            document_id=document_id,
            parent_block_id=parent_block_id,
            block_type="callout",
            content=inline_content,
            properties=attrs,
            position=position,
            path=path,
            child_refs=child_refs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type == "details":
        inline_content, child_refs = _split_toggle_children(node.get("content"))
        return _build_container_blocks_from_children(
            document_id=document_id,
            parent_block_id=parent_block_id,
            block_type="toggle",
            content=inline_content,
            properties=attrs,
            position=position,
            path=path,
            child_refs=child_refs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type == "table":
        return _build_structural_blocks_from_node(
            document_id=document_id,
            node=node,
            node_block_type="table",
            parent_block_id=parent_block_id,
            position=position,
            path=path,
            properties=attrs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type == "tableRow":
        return _build_structural_blocks_from_node(
            document_id=document_id,
            node=node,
            node_block_type="table_row",
            parent_block_id=parent_block_id,
            position=position,
            path=path,
            properties=attrs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type in {"tableCell", "tableHeader"}:
        if node_type == "tableHeader":
            attrs.setdefault("header", True)
        inline_content, child_refs = _split_wrapped_children(node.get("content"))
        return _build_container_blocks_from_children(
            document_id=document_id,
            parent_block_id=parent_block_id,
            block_type="table_cell",
            content=inline_content,
            properties=attrs,
            position=position,
            path=path,
            child_refs=child_refs,
            explicit_block_id=explicit_block_id,
            preserve_ids=preserve_ids,
        )

    if node_type == "horizontalRule":
        return [
            _build_block(
                document_id=document_id,
                parent_block_id=parent_block_id,
                block_type="divider",
                content=None,
                properties=attrs,
                position=position,
                path=path,
                explicit_block_id=explicit_block_id,
                preserve_ids=preserve_ids,
            )
        ]

    if node_type == "mentionBlock":
        return [
            _build_block(
                document_id=document_id,
                parent_block_id=parent_block_id,
                block_type="mention",
                content=None,
                properties=attrs,
                position=position,
                path=path,
                explicit_block_id=explicit_block_id,
                preserve_ids=preserve_ids,
            )
        ]

    if node_type == "embedBlock":
        return [
            _build_block(
                document_id=document_id,
                parent_block_id=parent_block_id,
                block_type="embed",
                content=None,
                properties=attrs,
                position=position,
                path=path,
                explicit_block_id=explicit_block_id,
                preserve_ids=preserve_ids,
            )
        ]

    raise ValueError(f"Unsupported TipTap node type: {node_type}")


def _build_inline_node(
    node_type: str,
    inline_content: list[dict[str, Any]],
    attrs: dict[str, Any],
) -> dict[str, Any]:
    node: dict[str, Any] = {"type": node_type}
    if attrs:
        node["attrs"] = attrs
    if inline_content:
        node["content"] = inline_content
    return node


def _build_structural_node(
    node_type: str,
    children: list[dict[str, Any]],
    attrs: dict[str, Any],
) -> dict[str, Any]:
    node: dict[str, Any] = {"type": node_type}
    if attrs:
        node["attrs"] = attrs
    if children:
        node["content"] = children
    return node


def _build_wrapped_node(
    node_type: str,
    inline_content: list[dict[str, Any]],
    children: list[dict[str, Any]],
    attrs: dict[str, Any],
) -> dict[str, Any]:
    node: dict[str, Any] = {"type": node_type}
    if attrs:
        node["attrs"] = attrs

    wrapped_children = [_paragraph_wrapper(inline_content)]
    wrapped_children.extend(children)
    node["content"] = wrapped_children
    return node


def _build_toggle_node(
    inline_content: list[dict[str, Any]],
    children: list[dict[str, Any]],
    attrs: dict[str, Any],
) -> dict[str, Any]:
    node: dict[str, Any] = {"type": "details"}
    if attrs:
        node["attrs"] = attrs

    content = [{"type": "detailsSummary"}]
    if inline_content:
        content[0]["content"] = inline_content
    details_content: dict[str, Any] = {"type": "detailsContent"}
    if children:
        details_content["content"] = children
    content.append(details_content)
    node["content"] = content
    return node


def _build_atomic_node(
    node_type: str,
    attrs: dict[str, Any],
) -> dict[str, Any]:
    node: dict[str, Any] = {"type": node_type}
    if attrs:
        node["attrs"] = attrs
    return node


def _paragraph_wrapper(inline_content: list[dict[str, Any]]) -> dict[str, Any]:
    paragraph: dict[str, Any] = {"type": "paragraph"}
    if inline_content:
        paragraph["content"] = inline_content
    return paragraph


def _build_structural_blocks_from_node(
    *,
    document_id: UUID,
    node: dict[str, Any],
    node_block_type: str,
    parent_block_id: UUID | None,
    position: int,
    path: BlockPath,
    properties: dict[str, Any],
    explicit_block_id: UUID | None,
    preserve_ids: PreserveIdMap | None,
) -> list[models.DocumentBlock]:
    child_refs = [
        ((index,), child)
        for index, child in enumerate(_as_node_list(node.get("content")))
    ]
    return _build_container_blocks_from_children(
        document_id=document_id,
        parent_block_id=parent_block_id,
        block_type=node_block_type,
        content=None,
        properties=properties,
        position=position,
        path=path,
        child_refs=child_refs,
        explicit_block_id=explicit_block_id,
        preserve_ids=preserve_ids,
    )


def _build_container_blocks_from_children(
    *,
    document_id: UUID,
    parent_block_id: UUID | None,
    block_type: str,
    content: list[dict[str, Any]] | None,
    properties: dict[str, Any],
    position: int,
    path: BlockPath,
    child_refs: list[tuple[BlockPath, dict[str, Any]]],
    explicit_block_id: UUID | None,
    preserve_ids: PreserveIdMap | None,
) -> list[models.DocumentBlock]:
    block = _build_block(
        document_id=document_id,
        parent_block_id=parent_block_id,
        block_type=block_type,
        content=content,
        properties=properties,
        position=position,
        path=path,
        explicit_block_id=explicit_block_id,
        preserve_ids=preserve_ids,
    )
    blocks = [block]

    for child_position, (path_suffix, child_node) in enumerate(child_refs):
        blocks.extend(
            _tiptap_node_to_blocks(
                document_id=document_id,
                node=child_node,
                parent_block_id=block.id,
                position=child_position,
                path=path + path_suffix,
                preserve_ids=preserve_ids,
            )
        )

    return blocks


def _build_block(
    *,
    document_id: UUID,
    parent_block_id: UUID | None,
    block_type: str,
    content: list[dict[str, Any]] | None,
    properties: dict[str, Any],
    position: int,
    path: BlockPath,
    explicit_block_id: UUID | None,
    preserve_ids: PreserveIdMap | None,
) -> models.DocumentBlock:
    block_id = _resolve_block_id(
        path,
        preserve_ids,
        explicit_block_id=explicit_block_id,
    )
    return models.DocumentBlock(
        id=block_id,
        document_id=document_id,
        parent_block_id=parent_block_id,
        block_type=block_type,
        content=content,
        properties=properties,
        position=position,
    )


def _ensure_acyclic_parent_chain(
    block: models.DocumentBlock,
    block_by_id: Mapping[UUID, models.DocumentBlock],
) -> None:
    assert block.id is not None

    seen_ids = {block.id}
    parent_id = block.parent_block_id
    while parent_id is not None:
        if parent_id in seen_ids:
            raise ValueError("Document blocks cannot contain parent cycles")
        seen_ids.add(parent_id)
        parent_block = block_by_id.get(parent_id)
        if parent_block is None:
            return
        parent_id = parent_block.parent_block_id


def _resolve_block_id(
    path: BlockPath,
    preserve_ids: PreserveIdMap | None,
    *,
    explicit_block_id: UUID | None,
) -> UUID:
    if explicit_block_id is not None:
        return explicit_block_id
    if preserve_ids is None:
        return uuid4()

    preserved_id = preserve_ids.get(path)
    if preserved_id is None:
        return uuid4()
    if isinstance(preserved_id, UUID):
        return preserved_id
    return UUID(str(preserved_id))


def _split_wrapped_children(
    raw_children: Any,
) -> tuple[list[dict[str, Any]], list[tuple[BlockPath, dict[str, Any]]]]:
    children = _as_node_list(raw_children)
    if not children:
        return [], []
    if _looks_like_inline_content(children):
        return _copy_inline_content(children), []

    if _node_type(children[0]) == "paragraph":
        return _copy_inline_content(children[0].get("content")), [
            ((index,), child) for index, child in enumerate(children[1:], start=1)
        ]

    return [], [((index,), child) for index, child in enumerate(children)]


def _split_toggle_children(
    raw_children: Any,
) -> tuple[list[dict[str, Any]], list[tuple[BlockPath, dict[str, Any]]]]:
    children = _as_node_list(raw_children)
    if not children:
        return [], []
    if _looks_like_inline_content(children):
        return _copy_inline_content(children), []

    summary_content: list[dict[str, Any]] = []
    child_refs: list[tuple[BlockPath, dict[str, Any]]] = []
    summary_consumed = False
    child_index = 0

    for child in children:
        child_type = _node_type(child)
        if child_type == "detailsSummary" and not summary_consumed:
            summary_content = _copy_inline_content(child.get("content"))
            summary_consumed = True
            continue
        if child_type == "detailsContent":
            for inner_child in _as_node_list(child.get("content")):
                child_refs.append(((1, child_index), inner_child))
                child_index += 1
            continue
        child_refs.append(((1, child_index), child))
        child_index += 1

    return summary_content, child_refs


def _as_node_list(raw_nodes: Any) -> list[dict[str, Any]]:
    if raw_nodes is None:
        return []
    if not isinstance(raw_nodes, list):
        raise ValueError("TipTap node content must be a list")
    nodes: list[dict[str, Any]] = []
    for raw_node in raw_nodes:
        if not isinstance(raw_node, dict):
            raise ValueError("TipTap node entries must be objects")
        nodes.append(deepcopy(raw_node))
    return nodes


def _copy_inline_content(raw_content: Any) -> list[dict[str, Any]]:
    return _as_node_list(raw_content)


def _copy_dict(raw_attrs: Any) -> dict[str, Any]:
    if raw_attrs is None:
        return {}
    if not isinstance(raw_attrs, dict):
        raise ValueError("TipTap node attrs must be an object")
    return deepcopy(raw_attrs)


def _attrs_with_block_id(block: models.DocumentBlock) -> dict[str, Any]:
    if block.id is None:
        raise ValueError(
            "Document blocks must have stable UUIDs before TipTap serialization"
        )
    attrs = _copy_dict(block.properties)
    attrs["blockId"] = str(block.id)
    return attrs


def _pop_explicit_block_id(attrs: dict[str, Any]) -> UUID | None:
    raw_block_id = attrs.pop("blockId", None)
    if raw_block_id in {None, ""}:
        return None
    try:
        return (
            raw_block_id if isinstance(raw_block_id, UUID) else UUID(str(raw_block_id))
        )
    except (TypeError, ValueError) as exc:
        raise ValueError("TipTap blockId attrs must be valid UUIDs") from exc


def _node_type(node: dict[str, Any]) -> str:
    node_type = node.get("type")
    if not isinstance(node_type, str) or not node_type:
        raise ValueError("TipTap nodes must include a string type")
    return node_type


def _looks_like_inline_content(children: Sequence[dict[str, Any]]) -> bool:
    if not children:
        return False
    first_type = _node_type(children[0])
    return first_type not in _BLOCK_NODE_TYPES and first_type not in {
        "detailsSummary",
        "detailsContent",
    }
