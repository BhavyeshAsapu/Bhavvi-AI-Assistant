"""
Chat API request/response schemas.
"""

from typing import Any

from pydantic import BaseModel, Field

from models.message import AttachedFile, MessageRole, SourceCitation, AgentTrace


class ChatRequest(BaseModel):
    """Payload for POST /chat."""

    session_id: str
    message: str = Field(..., min_length=1, max_length=32_000)
    file_ids: list[str] = Field(default_factory=list, description="IDs of previously uploaded files to attach.")


class ChatResponse(BaseModel):
    """Non-streaming chat response."""

    message_id: str
    session_id: str
    role: MessageRole
    content: str
    sources: list[SourceCitation] = Field(default_factory=list)
    agent_trace: AgentTrace | None = None
    attached_files: list[AttachedFile] = Field(default_factory=list)


class StreamChunk(BaseModel):
    """A single SSE chunk for streaming responses."""

    type: str  # "token" | "sources" | "done" | "error"
    content: str | None = None
    sources: list[SourceCitation] | None = None
    agent_trace: AgentTrace | None = None
    message_id: str | None = None


class CreateSessionRequest(BaseModel):
    """Create a new chat session."""

    title: str = Field(default="New Conversation", max_length=200)


class UpdateSessionRequest(BaseModel):
    """Rename or archive a session."""

    title: str | None = Field(default=None, max_length=200)
    is_archived: bool | None = None
