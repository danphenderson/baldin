from __future__ import annotations

from copy import deepcopy
from uuid import UUID, uuid4

import pytest

from app import models
from app.core.document_blocks import (
    block_ids_by_tiptap_path,
    blocks_to_tiptap_json,
    compute_block_sync_delta,
    tiptap_json_to_blocks,
    validate_block_tree,
)


def _inline_text(text: str, *, bold: bool = False) -> list[dict]:
    node: dict[str, object] = {"type": "text", "text": text}
    if bold:
        node["marks"] = [{"type": "bold"}]
    return [node]


def _paragraph_node(text: str) -> dict[str, object]:
    return {"type": "paragraph", "content": _inline_text(text)}


def _details_node(
    summary: str,
    *children: dict[str, object],
    attrs: dict | None = None,
) -> dict[str, object]:
    content: list[dict[str, object]] = [
        {"type": "detailsSummary", "content": _inline_text(summary)}
    ]
    details_content: dict[str, object] = {"type": "detailsContent"}
    if children:
        details_content["content"] = list(children)
    content.append(details_content)

    node: dict[str, object] = {"type": "details", "content": content}
    if attrs:
        node["attrs"] = deepcopy(attrs)
    return node


def _block(
    document_id: UUID,
    *,
    block_id: UUID,
    block_type: str,
    position: int,
    parent_block_id: UUID | None = None,
    content: list[dict] | None = None,
    properties: dict | None = None,
) -> models.DocumentBlock:
    return models.DocumentBlock(
        id=block_id,
        document_id=document_id,
        parent_block_id=parent_block_id,
        block_type=block_type,
        content=deepcopy(content),
        properties=deepcopy(properties or {}),
        position=position,
    )


def _complex_blocks(document_id: UUID) -> list[models.DocumentBlock]:
    heading_id = uuid4()
    paragraph_id = uuid4()
    bullet_list_id = uuid4()
    bullet_item_id = uuid4()
    nested_ordered_list_id = uuid4()
    nested_ordered_item_id = uuid4()
    task_list_id = uuid4()
    task_item_id = uuid4()
    blockquote_id = uuid4()
    blockquote_para_id = uuid4()
    code_block_id = uuid4()
    callout_id = uuid4()
    callout_child_para_id = uuid4()
    toggle_id = uuid4()
    toggle_child_para_id = uuid4()
    divider_id = uuid4()
    table_id = uuid4()
    header_row_id = uuid4()
    data_row_id = uuid4()
    header_cell_one_id = uuid4()
    header_cell_two_id = uuid4()
    data_cell_one_id = uuid4()
    data_cell_two_id = uuid4()

    return [
        _block(
            document_id,
            block_id=heading_id,
            block_type="heading",
            position=0,
            content=_inline_text("Session plan", bold=True),
            properties={"level": 2, "agent_section": "title"},
        ),
        _block(
            document_id,
            block_id=paragraph_id,
            block_type="paragraph",
            position=1,
            content=_inline_text("Opening context"),
            properties={"agent_run_id": "run-123"},
        ),
        _block(
            document_id,
            block_id=bullet_list_id,
            block_type="bullet_list",
            position=2,
            properties={"agent_section": "bullets"},
        ),
        _block(
            document_id,
            block_id=bullet_item_id,
            block_type="list_item",
            parent_block_id=bullet_list_id,
            position=0,
            content=_inline_text("Primary bullet"),
            properties={"nesting_hint": "kept"},
        ),
        _block(
            document_id,
            block_id=nested_ordered_list_id,
            block_type="ordered_list",
            parent_block_id=bullet_item_id,
            position=0,
            properties={"start": 3, "agent_weight": 0.9},
        ),
        _block(
            document_id,
            block_id=nested_ordered_item_id,
            block_type="list_item",
            parent_block_id=nested_ordered_list_id,
            position=0,
            content=_inline_text("Nested ordered item"),
        ),
        _block(
            document_id,
            block_id=task_list_id,
            block_type="task_list",
            position=3,
        ),
        _block(
            document_id,
            block_id=task_item_id,
            block_type="task_item",
            parent_block_id=task_list_id,
            position=0,
            content=_inline_text("Follow up with recruiter"),
            properties={"checked": True, "agent_step": "follow_up"},
        ),
        _block(
            document_id,
            block_id=blockquote_id,
            block_type="blockquote",
            position=4,
            content=_inline_text("Quoted takeaway"),
            properties={"agent_section": "quote"},
        ),
        _block(
            document_id,
            block_id=blockquote_para_id,
            block_type="paragraph",
            parent_block_id=blockquote_id,
            position=0,
            content=_inline_text("Nested support paragraph"),
        ),
        _block(
            document_id,
            block_id=code_block_id,
            block_type="code_block",
            position=5,
            content=_inline_text("print('hello world')"),
            properties={"language": "python", "agent_origin": "snippet"},
        ),
        _block(
            document_id,
            block_id=callout_id,
            block_type="callout",
            position=6,
            content=_inline_text("Important note"),
            properties={"callout_type": "warning", "confidence_score": 0.72},
        ),
        _block(
            document_id,
            block_id=callout_child_para_id,
            block_type="paragraph",
            parent_block_id=callout_id,
            position=0,
            content=_inline_text("Callout body"),
        ),
        _block(
            document_id,
            block_id=toggle_id,
            block_type="toggle",
            position=7,
            content=_inline_text("Expand notes"),
            properties={"agent_section": "toggle"},
        ),
        _block(
            document_id,
            block_id=toggle_child_para_id,
            block_type="paragraph",
            parent_block_id=toggle_id,
            position=0,
            content=_inline_text("Hidden detail"),
        ),
        _block(
            document_id,
            block_id=divider_id,
            block_type="divider",
            position=8,
            properties={"agent_divider": True},
        ),
        _block(
            document_id,
            block_id=table_id,
            block_type="table",
            position=9,
            properties={"agent_section": "matrix"},
        ),
        _block(
            document_id,
            block_id=header_row_id,
            block_type="table_row",
            parent_block_id=table_id,
            position=0,
        ),
        _block(
            document_id,
            block_id=header_cell_one_id,
            block_type="table_cell",
            parent_block_id=header_row_id,
            position=0,
            content=_inline_text("Role"),
            properties={"header": True, "colspan": 1, "rowspan": 1},
        ),
        _block(
            document_id,
            block_id=header_cell_two_id,
            block_type="table_cell",
            parent_block_id=header_row_id,
            position=1,
            content=_inline_text("Fit"),
            properties={"header": True, "colspan": 1, "rowspan": 1},
        ),
        _block(
            document_id,
            block_id=data_row_id,
            block_type="table_row",
            parent_block_id=table_id,
            position=1,
        ),
        _block(
            document_id,
            block_id=data_cell_one_id,
            block_type="table_cell",
            parent_block_id=data_row_id,
            position=0,
            content=_inline_text("Platform Engineer"),
            properties={"header": False, "colspan": 1, "rowspan": 1},
        ),
        _block(
            document_id,
            block_id=data_cell_two_id,
            block_type="table_cell",
            parent_block_id=data_row_id,
            position=1,
            content=_inline_text("Strong"),
            properties={
                "header": False,
                "colspan": 1,
                "rowspan": 1,
                "agent_annotation": "recommended",
            },
        ),
    ]


def _tree_snapshot(
    blocks: list[models.DocumentBlock],
    *,
    include_ids: bool = False,
) -> list[dict]:
    children_by_parent: dict[UUID | None, list[models.DocumentBlock]] = {}
    for block in blocks:
        children_by_parent.setdefault(block.parent_block_id, []).append(block)

    for siblings in children_by_parent.values():
        siblings.sort(key=lambda block: (block.position, str(block.id)))

    def serialize(parent_block_id: UUID | None) -> list[dict]:
        serialized: list[dict] = []
        for block in children_by_parent.get(parent_block_id, []):
            payload = {
                "block_type": block.block_type,
                "content": deepcopy(block.content),
                "properties": deepcopy(block.properties),
                "position": block.position,
                "children": serialize(block.id),
            }
            if include_ids:
                payload["id"] = str(block.id)
            serialized.append(payload)
        return serialized

    return serialize(None)


def _strip_block_ids(value: object) -> object:
    if isinstance(value, list):
        return [_strip_block_ids(item) for item in value]
    if not isinstance(value, dict):
        return value

    copied = {key: _strip_block_ids(item) for key, item in value.items()}
    attrs = copied.get("attrs")
    if isinstance(attrs, dict):
        attrs = {key: item for key, item in attrs.items() if key != "blockId"}
        if attrs:
            copied["attrs"] = attrs
        else:
            copied.pop("attrs", None)
    return copied


def test_blocks_round_trip_all_supported_types_losslessly() -> None:
    document_id = uuid4()
    blocks = _complex_blocks(document_id)

    tiptap_json = blocks_to_tiptap_json(blocks)
    restored_blocks = tiptap_json_to_blocks(document_id, tiptap_json)

    assert tiptap_json["type"] == "doc"
    assert _tree_snapshot(restored_blocks) == _tree_snapshot(blocks)


def test_unknown_property_keys_survive_round_trip() -> None:
    document_id = uuid4()
    blocks = _complex_blocks(document_id)

    tiptap_json = blocks_to_tiptap_json(blocks)
    restored_blocks = tiptap_json_to_blocks(document_id, tiptap_json)
    restored_snapshot = _tree_snapshot(restored_blocks)

    heading = restored_snapshot[0]
    paragraph = restored_snapshot[1]
    callout = restored_snapshot[6]
    table = restored_snapshot[9]
    data_cell = table["children"][1]["children"][1]

    assert heading["properties"]["agent_section"] == "title"
    assert paragraph["properties"]["agent_run_id"] == "run-123"
    assert callout["properties"]["confidence_score"] == 0.72
    assert data_cell["properties"]["agent_annotation"] == "recommended"


def test_tiptap_json_to_blocks_reuses_preserved_ids_for_matching_paths() -> None:
    document_id = uuid4()
    blocks = _complex_blocks(document_id)
    preserve_ids = block_ids_by_tiptap_path(blocks)
    tiptap_json = blocks_to_tiptap_json(blocks)

    tiptap_json["content"][0]["content"][0]["text"] = "Updated title"
    tiptap_json["content"].append(
        {"type": "paragraph", "content": _inline_text("Fresh note")}
    )

    restored_blocks = tiptap_json_to_blocks(
        document_id,
        tiptap_json,
        preserve_ids=preserve_ids,
    )

    restored_ids = block_ids_by_tiptap_path(restored_blocks)

    for path, block_id in preserve_ids.items():
        assert restored_ids[path] == block_id

    new_path = (len(tiptap_json["content"]) - 1,)
    assert restored_ids[new_path] not in set(preserve_ids.values())


def test_toggle_details_content_round_trips_losslessly() -> None:
    document_id = uuid4()
    tiptap_json = {
        "type": "doc",
        "content": [
            _details_node(
                "Expand context",
                _paragraph_node("Hidden details"),
                attrs={"agent_section": "toggle"},
            )
        ],
    }

    blocks = tiptap_json_to_blocks(document_id, deepcopy(tiptap_json))

    assert _strip_block_ids(blocks_to_tiptap_json(blocks)) == tiptap_json


def test_tiptap_json_to_blocks_reuses_preserved_ids_for_details_content_toggle_children() -> (
    None
):
    document_id = uuid4()
    tiptap_json = {
        "type": "doc",
        "content": [
            _details_node(
                "Expand context",
                _paragraph_node("Hidden details"),
                attrs={"agent_section": "toggle"},
            )
        ],
    }

    blocks = tiptap_json_to_blocks(document_id, deepcopy(tiptap_json))
    preserve_ids = block_ids_by_tiptap_path(blocks)
    updated_tiptap_json = deepcopy(tiptap_json)
    updated_tiptap_json["content"][0]["content"][1]["content"][0]["content"][0][
        "text"
    ] = "Updated hidden details"

    restored_blocks = tiptap_json_to_blocks(
        document_id,
        updated_tiptap_json,
        preserve_ids=preserve_ids,
    )
    restored_ids = block_ids_by_tiptap_path(restored_blocks)

    assert set(preserve_ids) == {(0,), (0, 1, 0)}
    assert restored_ids[(0,)] == preserve_ids[(0,)]
    assert restored_ids[(0, 1, 0)] == preserve_ids[(0, 1, 0)]


def test_tiptap_json_to_blocks_without_preserve_ids_assigns_fresh_uuids() -> None:
    document_id = uuid4()
    tiptap_json = {
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": {"level": 3, "agent_section": "summary"},
                "content": _inline_text("Generated session"),
            },
            {
                "type": "details",
                "attrs": {"agent_section": "toggle"},
                "content": [
                    {
                        "type": "detailsSummary",
                        "content": _inline_text("Expand context"),
                    },
                    {
                        "type": "paragraph",
                        "content": _inline_text("Hidden details"),
                    },
                ],
            },
            {
                "type": "table",
                "content": [
                    {
                        "type": "tableRow",
                        "content": [
                            {
                                "type": "tableHeader",
                                "attrs": {"colspan": 1, "rowspan": 1},
                                "content": [
                                    {
                                        "type": "paragraph",
                                        "content": _inline_text("Column"),
                                    }
                                ],
                            },
                            {
                                "type": "tableCell",
                                "attrs": {
                                    "colspan": 1,
                                    "rowspan": 1,
                                    "agent_annotation": "fresh",
                                },
                                "content": [
                                    {
                                        "type": "paragraph",
                                        "content": _inline_text("Value"),
                                    }
                                ],
                            },
                        ],
                    }
                ],
            },
        ],
    }

    blocks = tiptap_json_to_blocks(document_id, tiptap_json)

    assert len(blocks) == 7
    assert all(block.id is not None for block in blocks)
    assert len({block.id for block in blocks}) == len(blocks)

    snapshot = _tree_snapshot(blocks)
    assert snapshot[0]["block_type"] == "heading"
    assert snapshot[0]["properties"] == {"level": 3, "agent_section": "summary"}
    assert snapshot[1]["block_type"] == "toggle"
    assert snapshot[1]["children"][0]["block_type"] == "paragraph"
    assert snapshot[2]["block_type"] == "table"
    assert snapshot[2]["children"][0]["children"][0]["properties"]["header"] is True
    assert (
        snapshot[2]["children"][0]["children"][1]["properties"]["agent_annotation"]
        == "fresh"
    )


def test_tiptap_json_to_blocks_rejects_non_document_roots() -> None:
    with pytest.raises(ValueError, match="document node"):
        tiptap_json_to_blocks(uuid4(), {"type": "paragraph"})


def test_tiptap_json_to_blocks_prefers_explicit_block_ids_over_path_preservation() -> (
    None
):
    document_id = uuid4()
    explicit_block_id = uuid4()
    preserved_block_id = uuid4()

    blocks = tiptap_json_to_blocks(
        document_id,
        {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {"blockId": str(explicit_block_id)},
                    "content": _inline_text("Stable block"),
                }
            ],
        },
        preserve_ids={(0,): preserved_block_id},
    )

    assert blocks[0].id == explicit_block_id
    assert blocks[0].properties == {}


def test_mention_and_embed_blocks_round_trip_with_saved_properties() -> None:
    document_id = uuid4()
    mention_block_id = uuid4()
    embed_block_id = uuid4()

    blocks = [
        _block(
            document_id,
            block_id=mention_block_id,
            block_type="mention",
            position=0,
            properties={
                "targetKind": "user",
                "targetId": str(uuid4()),
                "label": "Casey Blocks",
            },
        ),
        _block(
            document_id,
            block_id=embed_block_id,
            block_type="embed",
            position=1,
            properties={
                "sourceDocumentId": str(uuid4()),
                "sourceBlockId": str(uuid4()),
                "sourceVersionIdAtSave": str(uuid4()),
                "label": "Interview prep notes",
                "previewText": "Prepare STAR stories",
            },
        ),
    ]

    tiptap_json = blocks_to_tiptap_json(blocks)
    restored_blocks = tiptap_json_to_blocks(document_id, tiptap_json)

    assert _tree_snapshot(restored_blocks, include_ids=True) == _tree_snapshot(
        blocks,
        include_ids=True,
    )


def test_validate_block_tree_rejects_nested_mention_and_embed_blocks() -> None:
    document_id = uuid4()
    list_id = uuid4()
    list_item_id = uuid4()

    blocks = [
        _block(
            document_id,
            block_id=list_id,
            block_type="bullet_list",
            position=0,
        ),
        _block(
            document_id,
            block_id=list_item_id,
            block_type="list_item",
            parent_block_id=list_id,
            position=0,
            content=_inline_text("List item"),
        ),
        _block(
            document_id,
            block_id=uuid4(),
            block_type="mention",
            parent_block_id=list_item_id,
            position=0,
            properties={"targetKind": "user", "targetId": str(uuid4())},
        ),
    ]

    with pytest.raises(ValueError, match="cannot be placed beneath list_item"):
        validate_block_tree(blocks)


def test_compute_block_sync_delta_tracks_added_removed_updated_and_moved_blocks() -> (
    None
):
    document_id = uuid4()
    original_parent_id = uuid4()
    changed_block_id = uuid4()
    moved_block_id = uuid4()
    removed_block_id = uuid4()
    added_block_id = uuid4()

    existing_blocks = [
        _block(
            document_id,
            block_id=original_parent_id,
            block_type="toggle",
            position=0,
            content=_inline_text("Parent"),
        ),
        _block(
            document_id,
            block_id=changed_block_id,
            block_type="paragraph",
            position=1,
            content=_inline_text("Original text"),
        ),
        _block(
            document_id,
            block_id=moved_block_id,
            block_type="paragraph",
            parent_block_id=original_parent_id,
            position=0,
            content=_inline_text("Nested"),
        ),
        _block(
            document_id,
            block_id=removed_block_id,
            block_type="paragraph",
            position=2,
            content=_inline_text("Remove me"),
        ),
    ]
    incoming_blocks = [
        _block(
            document_id,
            block_id=original_parent_id,
            block_type="toggle",
            position=0,
            content=_inline_text("Parent"),
        ),
        _block(
            document_id,
            block_id=changed_block_id,
            block_type="paragraph",
            position=1,
            content=_inline_text("Updated text"),
        ),
        _block(
            document_id,
            block_id=moved_block_id,
            block_type="paragraph",
            position=2,
            content=_inline_text("Nested"),
        ),
        _block(
            document_id,
            block_id=added_block_id,
            block_type="paragraph",
            parent_block_id=original_parent_id,
            position=0,
            content=_inline_text("Added"),
        ),
    ]

    delta = compute_block_sync_delta(existing_blocks, incoming_blocks)

    assert delta.added_block_ids == {added_block_id}
    assert delta.removed_block_ids == {removed_block_id}
    assert delta.updated_block_ids == {changed_block_id}
    assert delta.moved_block_ids == {moved_block_id}
    assert delta.touched_parent_ids == {None, original_parent_id}
