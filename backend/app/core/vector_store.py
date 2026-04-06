# Path: app/core/vector_store.py

"""
Vector store abstraction for document embedding storage and semantic search.

Uses pgvector with SQLAlchemy for PostgreSQL-backed vector similarity search.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Sequence
from uuid import UUID

from langchain_openai import OpenAIEmbeddings
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import conf
from app.logging import get_logger
from app.models import DocumentEmbedding

logger = get_logger(__name__)


def _get_embeddings_client() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model=conf.openai.EMBEDDING_MODEL,
        dimensions=conf.openai.EMBEDDING_DIMENSIONS,
    )


class BaseVectorStore(ABC):
    """Abstract base class for vector store implementations."""

    @abstractmethod
    async def add_texts(
        self,
        texts: list[str],
        *,
        document_id: UUID,
        document_version_id: UUID,
        user_id: UUID,
    ) -> list[UUID]:
        """Embed and store text chunks, returning their embedding IDs."""

    @abstractmethod
    async def similarity_search(
        self,
        query: str,
        *,
        user_id: UUID,
        k: int = 5,
    ) -> list[dict[str, Any]]:
        """Return the *k* most similar chunks for a query, scoped to a user."""

    @abstractmethod
    async def delete_by_document(self, document_id: UUID) -> int:
        """Remove all embeddings for a document.  Returns the number deleted."""


class PGVectorStore(BaseVectorStore):
    """pgvector-backed vector store using the application's async session."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self._embeddings = _get_embeddings_client()

    async def add_texts(
        self,
        texts: list[str],
        *,
        document_id: UUID,
        document_version_id: UUID,
        user_id: UUID,
    ) -> list[UUID]:
        vectors = await self._embeddings.aembed_documents(texts)
        ids: list[UUID] = []
        for idx, (chunk, vector) in enumerate(zip(texts, vectors)):
            row = DocumentEmbedding(
                document_id=document_id,
                document_version_id=document_version_id,
                user_id=user_id,
                chunk_index=idx,
                chunk_text=chunk,
                embedding=vector,
            )
            self.session.add(row)
            await self.session.flush()
            ids.append(row.id)
        return ids

    async def similarity_search(
        self,
        query: str,
        *,
        user_id: UUID,
        k: int = 5,
    ) -> list[dict[str, Any]]:
        query_vector = await self._embeddings.aembed_query(query)
        distance_expr = DocumentEmbedding.embedding.cosine_distance(query_vector)
        stmt = (
            select(
                DocumentEmbedding.id,
                DocumentEmbedding.document_id,
                DocumentEmbedding.document_version_id,
                DocumentEmbedding.chunk_index,
                DocumentEmbedding.chunk_text,
                distance_expr.label("distance"),
            )
            .where(DocumentEmbedding.user_id == user_id)
            .order_by(distance_expr)
            .limit(k)
        )
        result = await self.session.execute(stmt)
        return [
            {
                "id": row.id,
                "document_id": row.document_id,
                "document_version_id": row.document_version_id,
                "chunk_index": row.chunk_index,
                "chunk_text": row.chunk_text,
                "score": 1.0 - float(row.distance),
            }
            for row in result
        ]

    async def delete_by_document(self, document_id: UUID) -> int:
        result = await self.session.execute(
            delete(DocumentEmbedding).where(
                DocumentEmbedding.document_id == document_id
            )
        )
        return int(result.rowcount or 0)
