"""
Message service — persistence for chat messages.
"""

from datetime import datetime, timezone

from bson import ObjectId

from core.database import get_messages_collection
from core.logging import get_logger
from models.message import AgentTrace, MessageInDB, MessagePublic, MessageRole, SourceCitation

logger = get_logger(__name__)


async def save_message(
    session_id: str,
    user_id: str,
    role: MessageRole,
    content: str,
    sources: list[SourceCitation] | None = None,
    agent_trace: AgentTrace | None = None,
    attached_file_ids: list[str] | None = None,
) -> MessagePublic:
    """Persist a single message and return its public representation."""
    collection = get_messages_collection()

    msg = MessageInDB(
        session_id=session_id,
        user_id=user_id,
        role=role,
        content=content,
        sources=sources or [],
        agent_trace=agent_trace,
    )

    result = await collection.insert_one(
        msg.model_dump(by_alias=True, exclude={"id"})
    )
    msg.id = str(result.inserted_id)
    return _to_public(msg)


async def get_session_messages(
    session_id: str, user_id: str, limit: int = 100
) -> list[MessagePublic]:
    """Return messages for a session in chronological order."""
    collection = get_messages_collection()
    cursor = (
        collection.find({"session_id": session_id, "user_id": user_id})
        .sort("created_at", 1)
        .limit(limit)
    )
    messages = []
    async for doc in cursor:
        m = MessageInDB(**{**doc, "_id": str(doc["_id"])})
        messages.append(_to_public(m))
    return messages


async def get_recent_messages(
    session_id: str, limit: int = 10
) -> list[dict]:
    """Return the most recent messages as LangChain-compatible dicts.

    Used by the Memory Agent to build conversation context.
    """
    collection = get_messages_collection()
    cursor = (
        collection.find({"session_id": session_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    docs.reverse()  # chronological order
    return [
        {"role": d["role"], "content": d["content"]}
        for d in docs
    ]


def _to_public(m: MessageInDB) -> MessagePublic:
    return MessagePublic(
        id=m.id,
        session_id=m.session_id,
        role=m.role,
        content=m.content,
        attached_files=m.attached_files,
        sources=m.sources,
        agent_trace=m.agent_trace,
        created_at=m.created_at,
    )
