"""
Message model.

Each message belongs to a session and represents a single turn in the
conversation. Messages track the role (user/assistant/system), the raw
content, any attached files, the agents that were invoked, and sources
retrieved by the RAG agent.
"""

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any

from pydantic import BaseModel, Field
from pydantic.functional_validators import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class AttachedFile(BaseModel):
    """Metadata for a file attached to a message."""

    file_id: str
    filename: str
    file_type: str  # "pdf" | "image"
    size_bytes: int


class SourceCitation(BaseModel):
    """A document source cited in a RAG response."""

    document_id: str
    filename: str
    page_number: int | None = None
    chunk_text: str
    relevance_score: float = Field(ge=0.0, le=1.0)


class AgentTrace(BaseModel):
    """Records which agents were invoked and their execution time."""

    agents_used: list[str] = Field(default_factory=list)
    planner_decision: str | None = None
    execution_time_ms: int = 0
    tokens_used: int | None = None


class MessageInDB(BaseModel):
    """MongoDB message document."""

    id: PyObjectId | None = Field(default=None, alias="_id")
    session_id: str
    user_id: str
    role: MessageRole
    content: str
    attached_files: list[AttachedFile] = Field(default_factory=list)
    sources: list[SourceCitation] = Field(default_factory=list)
    agent_trace: AgentTrace | None = None
    is_streaming: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class MessagePublic(BaseModel):
    """API response representation of a message."""

    id: str
    session_id: str
    role: MessageRole
    content: str
    attached_files: list[AttachedFile]
    sources: list[SourceCitation]
    agent_trace: AgentTrace | None
    created_at: datetime

    model_config = {"populate_by_name": True}
