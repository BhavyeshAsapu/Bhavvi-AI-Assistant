"""
File service — validates and persists uploaded files to disk.

Handles file type detection, size validation, unique filename generation,
and metadata persistence to MongoDB.
"""

import hashlib
import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile

from config.settings import get_settings
from core.database import get_documents_collection
from core.logging import get_logger
from models.document import DocumentInDB, DocumentPublic, DocumentStatus, DocumentType

logger = get_logger(__name__)

_MIME_TO_TYPE = {
    "application/pdf": DocumentType.PDF,
    "image/jpeg": DocumentType.IMAGE,
    "image/png": DocumentType.IMAGE,
    "image/webp": DocumentType.IMAGE,
}


async def save_upload(
    file: UploadFile,
    user_id: str,
    session_id: str | None = None,
) -> DocumentPublic:
    """Validate and save an uploaded file.

    Args:
        file: The incoming FastAPI UploadFile.
        user_id: Owning user.
        session_id: Optional session scope.

    Returns:
        DocumentPublic metadata.

    Raises:
        ValueError: For invalid file type or size.
    """
    settings = get_settings()

    # Validate MIME type
    content_type = file.content_type or ""
    if content_type not in settings.allowed_file_types:
        raise ValueError(
            f"Unsupported file type '{content_type}'. "
            f"Allowed: {', '.join(settings.allowed_file_types)}"
        )

    doc_type = _MIME_TO_TYPE[content_type]

    # Read content and validate size
    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise ValueError(
            f"File exceeds maximum size of {settings.max_upload_size_mb} MB."
        )

    # Generate unique storage path
    file_id = str(uuid.uuid4())
    suffix = Path(file.filename or "upload").suffix or _default_suffix(content_type)
    unique_name = f"{file_id}{suffix}"
    storage_path = f"{user_id}/{unique_name}"
    abs_path = settings.upload_path / user_id / unique_name
    abs_path.parent.mkdir(parents=True, exist_ok=True)

    # Write to disk asynchronously
    async with aiofiles.open(abs_path, "wb") as out:
        await out.write(content)

    # Persist metadata to MongoDB
    collection = get_documents_collection()
    doc = DocumentInDB(
        user_id=user_id,
        session_id=session_id,
        filename=unique_name,
        original_filename=file.filename or unique_name,
        document_type=doc_type,
        file_size_bytes=len(content),
        mime_type=content_type,
        storage_path=storage_path,
        status=DocumentStatus.PENDING,
    )
    result = await collection.insert_one(
        doc.model_dump(by_alias=True, exclude={"id"})
    )
    doc.id = str(result.inserted_id)

    logger.info(
        "file_uploaded",
        doc_id=doc.id,
        filename=doc.original_filename,
        size_bytes=len(content),
        user_id=user_id,
    )
    return _to_public(doc)


async def get_user_documents(user_id: str) -> list[DocumentPublic]:
    """Return all documents owned by a user."""
    collection = get_documents_collection()
    cursor = collection.find({"user_id": user_id}).sort("created_at", -1)
    docs = []
    async for d in cursor:
        doc = DocumentInDB(**{**d, "_id": str(d["_id"])})
        docs.append(_to_public(doc))
    return docs


async def get_document(doc_id: str, user_id: str) -> DocumentInDB:
    """Fetch a document by ID, enforcing user ownership."""
    from bson import ObjectId
    collection = get_documents_collection()
    doc = await collection.find_one({"_id": ObjectId(doc_id), "user_id": user_id})
    if not doc:
        raise FileNotFoundError(f"Document {doc_id} not found.")
    return DocumentInDB(**{**doc, "_id": str(doc["_id"])})


async def update_document_status(
    doc_id: str,
    status: DocumentStatus,
    page_count: int | None = None,
    chunk_count: int | None = None,
    error_message: str | None = None,
) -> None:
    """Update the processing status of a document."""
    from bson import ObjectId
    from datetime import datetime, timezone
    collection = get_documents_collection()
    updates: dict = {"status": status}
    if page_count is not None:
        updates["page_count"] = page_count
    if chunk_count is not None:
        updates["chunk_count"] = chunk_count
    if error_message is not None:
        updates["error_message"] = error_message
    if status == DocumentStatus.READY:
        updates["processed_at"] = datetime.now(timezone.utc)

    await collection.update_one({"_id": ObjectId(doc_id)}, {"$set": updates})


def _default_suffix(mime_type: str) -> str:
    return {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }.get(mime_type, ".bin")


def _to_public(d: DocumentInDB) -> DocumentPublic:
    return DocumentPublic(
        id=d.id,
        filename=d.filename,
        original_filename=d.original_filename,
        document_type=d.document_type,
        file_size_bytes=d.file_size_bytes,
        status=d.status,
        page_count=d.page_count,
        chunk_count=d.chunk_count,
        created_at=d.created_at,
        processed_at=d.processed_at,
    )
