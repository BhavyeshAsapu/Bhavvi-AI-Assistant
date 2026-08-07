"""
RAG retriever — top-K chunk retrieval with source citation building.

Combines query embedding + ChromaDB similarity search + metadata enrichment
into a single retrieval call that returns typed SourceCitation objects.
"""

from core.logging import get_logger
from models.message import SourceCitation
from rag.embeddings import embed_query
from vectorstore.chroma_store import similarity_search

logger = get_logger(__name__)

_DEFAULT_TOP_K = 5
_MIN_RELEVANCE_SCORE = 0.30  # Chunks below this threshold are discarded


async def retrieve_relevant_chunks(
    query: str,
    doc_ids: list[str] | None = None,
    top_k: int = _DEFAULT_TOP_K,
    min_score: float = _MIN_RELEVANCE_SCORE,
) -> list[SourceCitation]:
    """Retrieve the most relevant chunks for a query.

    Args:
        query: User's natural language question.
        doc_ids: Optional list of document IDs to scope the search.
                 If None, searches across all documents.
        top_k: Maximum number of chunks to retrieve.
        min_score: Minimum cosine similarity score (0–1) to include a result.

    Returns:
        List of SourceCitation objects ordered by relevance score (descending).
    """
    query_embedding = await embed_query(query)

    where_filter: dict | None = None
    if doc_ids and len(doc_ids) == 1:
        where_filter = {"doc_id": doc_ids[0]}
    elif doc_ids and len(doc_ids) > 1:
        where_filter = {"doc_id": {"$in": doc_ids}}

    raw_results = similarity_search(
        query_embedding=query_embedding,
        top_k=top_k,
        where=where_filter,
    )

    citations: list[SourceCitation] = []
    for result in raw_results:
        score = result["score"]
        if score < min_score:
            continue

        meta = result.get("metadata", {})
        citations.append(
            SourceCitation(
                document_id=meta.get("doc_id", "unknown"),
                filename=meta.get("original_filename", "Document"),
                page_number=meta.get("page_number"),
                chunk_text=result["document"],
                relevance_score=score,
            )
        )

    logger.info(
        "retrieval_complete",
        query_preview=query[:80],
        total_results=len(raw_results),
        filtered_results=len(citations),
        min_score=min_score,
    )

    return citations
