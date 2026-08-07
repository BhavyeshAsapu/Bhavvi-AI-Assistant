"""
ChromaDB vector store client.

Manages a persistent ChromaDB collection for document embeddings. All
operations are synchronous (ChromaDB's Python client is synchronous) but
wrapped to play nicely with FastAPI's async context.
"""

from functools import lru_cache

import chromadb
from chromadb.config import Settings as ChromaSettings

from config.settings import get_settings
from core.logging import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _get_chroma_client() -> chromadb.ClientAPI:
    """Return the singleton ChromaDB persistent client."""
    settings = get_settings()
    return chromadb.PersistentClient(
        path=settings.chroma_persist_directory,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def get_or_create_collection(collection_name: str | None = None) -> chromadb.Collection:
    """Return (or create) the ChromaDB collection for document embeddings."""
    settings = get_settings()
    name = collection_name or settings.chroma_collection_name
    client = _get_chroma_client()
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},  # Cosine similarity for semantic search
    )


def upsert_chunks(
    doc_id: str,
    chunks: list[str],
    embeddings: list[list[float]],
    metadata: dict,
    collection_name: str | None = None,
) -> int:
    """Insert or update document chunks in ChromaDB.

    Args:
        doc_id: MongoDB document ID used to namespace chunk IDs.
        chunks: Text chunks.
        embeddings: Pre-computed embedding vectors (must align with chunks).
        metadata: Document-level metadata attached to every chunk.
        collection_name: Override the default collection.

    Returns:
        Number of chunks upserted.
    """
    collection = get_or_create_collection(collection_name)

    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {**metadata, "chunk_index": i, "doc_id": doc_id}
        for i in range(len(chunks))
    ]

    collection.upsert(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    logger.info("chroma_upserted", doc_id=doc_id, chunks=len(chunks))
    return len(chunks)


def similarity_search(
    query_embedding: list[float],
    top_k: int = 5,
    where: dict | None = None,
    collection_name: str | None = None,
) -> list[dict]:
    """Perform a similarity search and return enriched results.

    Args:
        query_embedding: Query embedding vector.
        top_k: Number of results to return.
        where: Optional ChromaDB metadata filter dict.
        collection_name: Override the default collection.

    Returns:
        List of dicts with keys: id, document, metadata, distance, score.
    """
    collection = get_or_create_collection(collection_name)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    output = []
    if results["ids"] and results["ids"][0]:
        for i, chunk_id in enumerate(results["ids"][0]):
            distance = results["distances"][0][i]
            # Convert cosine distance → similarity score (0–1)
            score = max(0.0, 1.0 - distance)
            output.append(
                {
                    "id": chunk_id,
                    "document": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": distance,
                    "score": round(score, 4),
                }
            )

    return output


def delete_document_chunks(doc_id: str, collection_name: str | None = None) -> None:
    """Remove all chunks belonging to a document from ChromaDB."""
    collection = get_or_create_collection(collection_name)
    collection.delete(where={"doc_id": doc_id})
    logger.info("chroma_deleted", doc_id=doc_id)
