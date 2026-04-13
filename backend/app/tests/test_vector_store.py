"""Tests for vector store, document embedding, and semantic search schemas."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas import (
    CompanySummarizeRequest,
    CompanySummarizeResponse,
    DocumentEmbeddingRead,
    DocumentEmbedRequest,
    DocumentEmbedResponse,
    DocumentSearchRequest,
    DocumentSearchResponse,
    DocumentSearchResult,
    LeadEnrichRequest,
    LeadEnrichResponse,
    LeadRankedEntryRead,
    LeadRankInput,
    LeadRankRequest,
    LeadRankResponse,
)

_UUID1 = str(uuid4())
_UUID2 = str(uuid4())
_UUID3 = str(uuid4())


class TestDocumentSearchRequestSchema:
    def test_valid_request(self):
        req = DocumentSearchRequest(query="python developer", k=10)
        assert req.query == "python developer"
        assert req.k == 10

    def test_default_k(self):
        req = DocumentSearchRequest(query="test")
        assert req.k == 5

    def test_empty_query_rejected(self):
        with pytest.raises(ValidationError):
            DocumentSearchRequest(query="")

    def test_k_below_min_rejected(self):
        with pytest.raises(ValidationError):
            DocumentSearchRequest(query="test", k=0)

    def test_k_above_max_rejected(self):
        with pytest.raises(ValidationError):
            DocumentSearchRequest(query="test", k=51)


class TestDocumentSearchResultSchema:
    def test_valid_result(self):
        result = DocumentSearchResult(
            id=_UUID1,
            document_id=_UUID2,
            document_version_id=_UUID3,
            chunk_index=0,
            chunk_text="some relevant text",
            score=0.95,
        )
        assert result.score == 0.95
        assert result.chunk_text == "some relevant text"


class TestDocumentSearchResponseSchema:
    def test_valid_response(self):
        resp = DocumentSearchResponse(
            query="test query",
            results=[
                DocumentSearchResult(
                    id=_UUID1,
                    document_id=_UUID2,
                    document_version_id=_UUID3,
                    chunk_index=0,
                    chunk_text="text",
                    score=0.9,
                )
            ],
        )
        assert len(resp.results) == 1

    def test_empty_results(self):
        resp = DocumentSearchResponse(query="no matches", results=[])
        assert resp.results == []


class TestDocumentEmbedSchemas:
    def test_embed_request_defaults(self):
        req = DocumentEmbedRequest()
        assert req.version_id is None

    def test_embed_response(self):
        resp = DocumentEmbedResponse(
            document_id=_UUID1,
            document_version_id=_UUID2,
            chunks_embedded=5,
        )
        assert resp.chunks_embedded == 5


class TestDocumentEmbeddingReadSchema:
    def test_valid_read(self):
        read = DocumentEmbeddingRead(
            id=_UUID1,
            created_at="2024-01-01T00:00:00",
            updated_at="2024-01-01T00:00:00",
            document_id=_UUID2,
            document_version_id=_UUID3,
            chunk_index=0,
            chunk_text="some text",
        )
        assert read.chunk_index == 0


class TestLeadEnrichSchemas:
    def test_valid_request(self):
        req = LeadEnrichRequest(lead_description="Python backend engineer at Acme")
        assert req.k == 5

    def test_empty_description_rejected(self):
        with pytest.raises(ValidationError):
            LeadEnrichRequest(lead_description="")

    def test_response(self):
        resp = LeadEnrichResponse(enrichment="You have 5 matching skills...")
        assert resp.enrichment


class TestLeadRankSchemas:
    def test_valid_request(self):
        req = LeadRankRequest(
            leads=[
                {
                    "id": _UUID1,
                    "title": "SWE",
                    "description": "Backend developer",
                }
            ]
        )
        assert len(req.leads) == 1
        assert isinstance(req.leads[0], LeadRankInput)

    def test_empty_leads_rejected(self):
        with pytest.raises(ValidationError):
            LeadRankRequest(leads=[])

    def test_response(self):
        response = LeadRankResponse(
            ranking="Lead Rankings",
            ranked_leads=[
                LeadRankedEntryRead(
                    lead_id=_UUID1,
                    lead_index=1,
                    title="SWE",
                    relevance_score=9,
                    explanation="The role closely matches the backend experience in the user's profile.",
                    aspiration_alignment="Direct match to the user's backend engineering aspirations.",
                )
            ],
        )
        assert str(response.ranked_leads[0].lead_id) == _UUID1


class TestCompanySummarizeSchemas:
    def test_valid_request(self):
        req = CompanySummarizeRequest(url="https://example.com")
        assert req.url

    def test_empty_url_rejected(self):
        with pytest.raises(ValidationError):
            CompanySummarizeRequest(url="")

    def test_response(self):
        resp = CompanySummarizeResponse(
            url="https://example.com",
            summary="Example Corp is a technology company...",
        )
        assert resp.summary


class TestChunkText:
    def test_basic_chunking(self):
        from app.core.langchain import chunk_text

        text = "Hello world. " * 200
        chunks = chunk_text(text)
        assert len(chunks) >= 1
        assert all(len(c) > 0 for c in chunks)

    def test_empty_text(self):
        from app.core.langchain import chunk_text

        assert chunk_text("") == []
        assert chunk_text("   ") == []

    def test_short_text_single_chunk(self):
        from app.core.langchain import chunk_text

        chunks = chunk_text("A short sentence.")
        assert len(chunks) == 1
        assert chunks[0] == "A short sentence."


@pytest.mark.asyncio
async def test_pgvector_store_add_texts_flushes_once():
    from app.core.vector_store import PGVectorStore

    session = MagicMock()
    session.flush = AsyncMock()
    added_rows = []

    def add(row):
        row.id = uuid4()
        added_rows.append(row)

    session.add.side_effect = add

    store = PGVectorStore(session)
    store._embeddings = SimpleNamespace(
        aembed_documents=AsyncMock(return_value=[[0.1, 0.2], [0.3, 0.4]])
    )

    ids = await store.add_texts(
        ["alpha", "beta"],
        document_id=uuid4(),
        document_version_id=uuid4(),
        user_id=uuid4(),
    )

    session.flush.assert_awaited_once()
    assert ids == [row.id for row in added_rows]


@pytest.mark.asyncio
async def test_pgvector_store_similarity_search_applies_document_filter_and_returns_document_metadata():
    from app.core.vector_store import PGVectorStore

    document_id = uuid4()
    version_id = uuid4()
    user_id = uuid4()
    row_id = uuid4()
    session = MagicMock()
    session.execute = AsyncMock(
        return_value=[
            SimpleNamespace(
                id=row_id,
                document_id=document_id,
                document_version_id=version_id,
                chunk_index=0,
                chunk_text="retrieved chunk",
                document_title="Pinned Resume",
                document_kind="resume",
                distance=0.08,
            )
        ]
    )

    store = PGVectorStore(session)
    store._embeddings = SimpleNamespace(aembed_query=AsyncMock(return_value=[0.1, 0.2]))

    results = await store.similarity_search(
        "needle",
        user_id=user_id,
        k=3,
        document_ids=[document_id],
    )

    stmt = session.execute.await_args.args[0]
    assert "document_embeddings.document_id IN" in str(stmt)
    assert results == [
        {
            "id": row_id,
            "document_id": document_id,
            "document_version_id": version_id,
            "chunk_index": 0,
            "chunk_text": "retrieved chunk",
            "document_title": "Pinned Resume",
            "document_kind": "resume",
            "score": 0.92,
        }
    ]


@pytest.mark.asyncio
async def test_pgvector_store_delete_by_document_scopes_deletes_to_user_when_provided():
    from app.core.vector_store import PGVectorStore

    document_id = uuid4()
    user_id = uuid4()
    session = MagicMock()
    session.execute = AsyncMock(return_value=SimpleNamespace(rowcount=2))

    store = PGVectorStore(session)

    deleted = await store.delete_by_document(document_id, user_id=user_id)

    stmt = session.execute.await_args.args[0]
    assert "document_embeddings.user_id" in str(stmt)
    assert deleted == 2
