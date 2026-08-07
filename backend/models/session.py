"""
Chat session model.

A session represents one conversation thread. It belongs to a user and
contains an ordered list of messages. Sessions are the top-level grouping
unit in the chat history.
"""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field
from pydantic.functional_validators import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class SessionInDB(BaseModel):
    """MongoDB session document."""

    id: PyObjectId | None = Field(default=None, alias="_id")
    user_id: str
    title: str = "New Conversation"
    model: str = "gemini-2.5-flash"
    message_count: int = 0
    last_message_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_archived: bool = False
    metadata: dict = Field(default_factory=dict)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class SessionPublic(BaseModel):
    """API response representation of a session."""

    id: str
    title: str
    message_count: int
    last_message_at: datetime | None
    created_at: datetime
    is_archived: bool

    model_config = {"populate_by_name": True}
