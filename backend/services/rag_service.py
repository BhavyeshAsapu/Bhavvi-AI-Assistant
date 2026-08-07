"""
RAG orchestration service.

Ties together PDF processing, embedding generation, and ChromaDB indexing
into a single async pipeline. Called as a FastAPI BackgroundTask after upload.
"""

from pathlib import Path

from config.settings import get_settings
from core.logging import get_logger
from models.document import DocumentStatus
from rag.embeddings import embed_texts
from services.file_service import update_document_status
from services.pdf_service import extract_and_chunk_pdf
from vectorstore.chroma_store import upsert_chunks

logger = get_logger(__name__)


async def index_document(
    doc_id: str,
    storage_path: str,
    original_filename: str,
    user_id: str,
) -> None:
    """Full RAG indexing pipeline for a PDF document.

    1. Extract text and chunk
    2. Embed all chunks via Gemini
    3. Upsert into ChromaDB
    4. Update document status in MongoDB

    This function is designed to run as a background task — errors are
    caught and recorded in the document status rather than propagated.
    """
    settings = get_settings()
    abs_path = settings.upload_path / storage_path

    logger.info("rag_indexing_start", doc_id=doc_id, filename=original_filename)

    # Mark as processing
    await update_document_status(doc_id=doc_id, status=DocumentStatus.PROCESSING)

    try:
        # Step 1: Extract and chunk
        chunks, page_count = extract_and_chunk_pdf(abs_path)

        # Step 2: Generate embeddings
        embeddings = await embed_texts(chunks)

        # Step 3: Upsert into ChromaDB
        metadata = {
            "doc_id": doc_id,
            "original_filename": original_filename,
            "user_id": user_id,
        }
        chunk_count = upsert_chunks(
            doc_id=doc_id,
            chunks=chunks,
            embeddings=embeddings,
            metadata=metadata,
        )

        # Step 4: Mark ready
        await update_document_status(
            doc_id=doc_id,
            status=DocumentStatus.READY,
            page_count=page_count,
            chunk_count=chunk_count,
        )

        logger.info(
            "rag_indexing_complete",
            doc_id=doc_id,
            pages=page_count,
            chunks=chunk_count,
        )

    except Exception as exc:
        logger.error("rag_indexing_failed", doc_id=doc_id, error=str(exc))
        await update_document_status(
            doc_id=doc_id,
            status=DocumentStatus.FAILED,
            error_message=str(exc),
        )
