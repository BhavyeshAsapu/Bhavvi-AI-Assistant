"""
Document model.

Represents an uploaded file (PDF or image) that has been processed and
indexed. Tracks processing status, chunk count, and vector store location.
"""

from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field
from pydantic.functional_validators import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class DocumentStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class DocumentType(StrEnum):
    PDF = "pdf"
    IMAGE = "image"


class DocumentInDB(BaseModel):
    """MongoDB document metadata."""

    id: PyObjectId | None = Field(default=None, alias="_id")
    user_id: str
    session_id: str | None = None  # Optional: scoped to a session
    filename: str
    original_filename: str
    document_type: DocumentType
    file_size_bytes: int
    mime_type: str
    storage_path: str  # Relative path inside uploads/
    status: DocumentStatus = DocumentStatus.PENDING
    page_count: int | None = None
    chunk_count: int | None = None
    chroma_collection_id: str | None = None
    error_message: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: datetime | None = None

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class DocumentPublic(BaseModel):
    """API response representation of a document."""

    id: str
    filename: str
    original_filename: str
    document_type: DocumentType
    file_size_bytes: int
    status: DocumentStatus
    page_count: int | None
    chunk_count: int | None
    created_at: datetime
    processed_at: datetime | None

    model_config = {"populate_by_name": True}
