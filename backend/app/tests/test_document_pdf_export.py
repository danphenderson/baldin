"""Focused tests for cell-doc PDF export rendering."""

import json
from copy import deepcopy
from io import BytesIO

import pytest
from httpx import AsyncClient
from PyPDF2 import PdfReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table

from app.api.routes.documents import _tiptap_to_flowables

_BASE_STYLE = ParagraphStyle(
    name="ExportDefault",
    fontName="Helvetica",
    fontSize=12,
    leading=14,
    spaceAfter=0,
    spaceBefore=0,
)

CELL_DOC_EXPORT_CONTRACT_FIXTURE = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "content": [{"type": "text", "text": "Cell-doc export contract"}],
        },
        {
            "type": "taskList",
            "content": [
                {
                    "type": "taskItem",
                    "attrs": {"checked": False},
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {"type": "text", "text": "Follow up with recruiter"}
                            ],
                        }
                    ],
                },
                {
                    "type": "taskItem",
                    "attrs": {"checked": True},
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {"type": "text", "text": "Tailor resume bullet"}
                            ],
                        }
                    ],
                },
            ],
        },
        {
            "type": "callout",
            "attrs": {"callout_type": "tip"},
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Highlight quantified wins"}],
                },
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {"type": "text", "text": "Use concrete metrics"}
                                    ],
                                }
                            ],
                        }
                    ],
                },
            ],
        },
        {
            "type": "details",
            "attrs": {"open": False},
            "content": [
                {
                    "type": "detailsSummary",
                    "content": [{"type": "text", "text": "Interview prep notes"}],
                },
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": "Prepare STAR stories"}],
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
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": "Company"}],
                                }
                            ],
                        },
                        {
                            "type": "tableHeader",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": "Status"}],
                                }
                            ],
                        },
                    ],
                },
                {
                    "type": "tableRow",
                    "content": [
                        {
                            "type": "tableCell",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {"type": "text", "text": "Baldin Labs"}
                                    ],
                                }
                            ],
                        },
                        {
                            "type": "tableCell",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": "Applied"}],
                                }
                            ],
                        },
                    ],
                },
            ],
        },
        {
            "type": "paragraph",
            "content": [{"type": "text", "text": "Closing note"}],
        },
    ],
}


def _tiptap_document(*nodes: dict) -> str:
    return json.dumps({"type": "doc", "content": [deepcopy(node) for node in nodes]})


def _paragraph_plain_text(paragraph: Paragraph) -> str:
    getter = getattr(paragraph, "getPlainText", None)
    if callable(getter):
        return getter()
    return str(getattr(paragraph, "text", ""))


def _paragraph_texts(flowables: list) -> list[str]:
    return [
        _paragraph_plain_text(flowable)
        for flowable in flowables
        if isinstance(flowable, Paragraph)
    ]


def _table_text(table: Table, row: int, column: int) -> str:
    cell = table._cellvalues[row][column]
    if isinstance(cell, Paragraph):
        return _paragraph_plain_text(cell)
    return str(cell)


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _normalize_whitespace(text: str) -> str:
    return " ".join(text.split())


async def _login_headers(
    client: AsyncClient, email: str, password: str
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_tiptap_to_flowables_renders_task_items_with_checkbox_prefixes() -> None:
    task_list_node = CELL_DOC_EXPORT_CONTRACT_FIXTURE["content"][1]

    flowables = _tiptap_to_flowables(_tiptap_document(task_list_node), _BASE_STYLE)
    texts = _paragraph_texts(flowables)

    assert any(text.startswith("☐ ") for text in texts)
    assert any("Follow up with recruiter" in text for text in texts)
    assert any(text.startswith("☑ ") for text in texts)
    assert any("Tailor resume bullet" in text for text in texts)


def test_tiptap_to_flowables_renders_callout_label_and_body() -> None:
    callout_node = CELL_DOC_EXPORT_CONTRACT_FIXTURE["content"][2]

    flowables = _tiptap_to_flowables(_tiptap_document(callout_node), _BASE_STYLE)
    texts = _paragraph_texts(flowables)

    assert any(text == "TIP" for text in texts)
    assert any("Highlight quantified wins" in text for text in texts)
    assert any("Use concrete metrics" in text for text in texts)


def test_tiptap_to_flowables_expands_details_summary_and_body() -> None:
    details_node = CELL_DOC_EXPORT_CONTRACT_FIXTURE["content"][3]

    flowables = _tiptap_to_flowables(_tiptap_document(details_node), _BASE_STYLE)
    texts = _paragraph_texts(flowables)

    assert any("Interview prep notes" in text for text in texts)
    assert any("Prepare STAR stories" in text for text in texts)


def test_tiptap_to_flowables_renders_reportlab_table_flowable() -> None:
    table_node = CELL_DOC_EXPORT_CONTRACT_FIXTURE["content"][4]

    flowables = _tiptap_to_flowables(_tiptap_document(table_node), _BASE_STYLE)
    tables = [flowable for flowable in flowables if isinstance(flowable, Table)]

    assert len(tables) == 1
    table = tables[0]
    assert table._nrows == 2
    assert table._ncols == 2
    assert _table_text(table, 0, 0) == "Company"
    assert _table_text(table, 0, 1) == "Status"
    assert _table_text(table, 1, 0) == "Baldin Labs"
    assert _table_text(table, 1, 1) == "Applied"


@pytest.mark.asyncio(loop_scope="module")
async def test_download_document_renders_mixed_cell_doc_contract_pdf(
    client: AsyncClient,
    registered_user: tuple[str, object, str],
) -> None:
    email, _, password = registered_user
    auth_headers = await _login_headers(client, email, password)
    content = json.dumps(CELL_DOC_EXPORT_CONTRACT_FIXTURE)

    create_response = await client.post(
        "/api/v1/documents/",
        json={
            "kind": "cell_doc",
            "title": "Story 9 Export Sample",
            "content": content,
            "content_format": "tiptap_json",
        },
        headers=auth_headers,
    )
    assert create_response.status_code == 201, create_response.text

    document_id = create_response.json()["id"]
    download_response = await client.get(
        f"/api/v1/documents/{document_id}/download",
        headers=auth_headers,
    )

    assert download_response.status_code == 200, download_response.text
    assert download_response.headers["content-type"] == "application/pdf"

    pdf_text = _normalize_whitespace(_extract_pdf_text(download_response.content))
    assert "Cell-doc export contract" in pdf_text
    assert "Follow up with recruiter" in pdf_text
    assert "Tailor resume bullet" in pdf_text
    assert "TIP" in pdf_text
    assert "Highlight quantified wins" in pdf_text
    assert "Use concrete metrics" in pdf_text
    assert "Interview prep notes" in pdf_text
    assert "Prepare STAR stories" in pdf_text
    assert "Company" in pdf_text
    assert "Status" in pdf_text
    assert "Baldin Labs" in pdf_text
    assert "Applied" in pdf_text
    assert "Closing note" in pdf_text
