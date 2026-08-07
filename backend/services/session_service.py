"""
Session service — CRUD for chat sessions.
"""

from datetime import datetime, timezone

from bson import ObjectId

from core.database import get_sessions_collection
from core.logging import get_logger
from models.session import SessionInDB, SessionPublic

logger = get_logger(__name__)


async def create_session(user_id: str, title: str = "New Conversation") -> SessionPublic:
    """Create a new chat session for the given user."""
    collection = get_sessions_collection()
    session = SessionInDB(user_id=user_id, title=title)
    result = await collection.insert_one(
        session.model_dump(by_alias=True, exclude={"id"})
    )
    session.id = str(result.inserted_id)
    logger.info("session_created", session_id=session.id, user_id=user_id)
    return _to_public(session)


async def get_user_sessions(user_id: str, limit: int = 50) -> list[SessionPublic]:
    """Return all non-archived sessions for a user, newest first."""
    collection = get_sessions_collection()
    cursor = (
        collection.find({"user_id": user_id, "is_archived": False})
        .sort("updated_at", -1)
        .limit(limit)
    )
    sessions = []
    async for doc in cursor:
        s = SessionInDB(**{**doc, "_id": str(doc["_id"])})
        sessions.append(_to_public(s))
    return sessions


async def get_session(session_id: str, user_id: str) -> SessionPublic:
    """Fetch a single session, ensuring it belongs to the requesting user."""
    collection = get_sessions_collection()
    doc = await collection.find_one(
        {"_id": ObjectId(session_id), "user_id": user_id}
    )
    if not doc:
        raise FileNotFoundError(f"Session {session_id} not found.")
    s = SessionInDB(**{**doc, "_id": str(doc["_id"])})
    return _to_public(s)


async def update_session(
    session_id: str,
    user_id: str,
    title: str | None = None,
    is_archived: bool | None = None,
) -> SessionPublic:
    """Update the title or archive status of a session."""
    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if title is not None:
        updates["title"] = title
    if is_archived is not None:
        updates["is_archived"] = is_archived

    collection = get_sessions_collection()
    result = await collection.find_one_and_update(
        {"_id": ObjectId(session_id), "user_id": user_id},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise FileNotFoundError(f"Session {session_id} not found.")
    s = SessionInDB(**{**result, "_id": str(result["_id"])})
    return _to_public(s)


async def delete_session(session_id: str, user_id: str) -> None:
    """Permanently delete a session and its messages."""
    from core.database import get_messages_collection
    sessions = get_sessions_collection()
    messages = get_messages_collection()

    result = await sessions.delete_one(
        {"_id": ObjectId(session_id), "user_id": user_id}
    )
    if result.deleted_count == 0:
        raise FileNotFoundError(f"Session {session_id} not found.")

    await messages.delete_many({"session_id": session_id})
    logger.info("session_deleted", session_id=session_id, user_id=user_id)


async def increment_message_count(session_id: str) -> None:
    """Atomically increment the message counter and update timestamp."""
    collection = get_sessions_collection()
    await collection.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$inc": {"message_count": 1},
            "$set": {"last_message_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
        },
    )


def _to_public(s: SessionInDB) -> SessionPublic:
    return SessionPublic(
        id=s.id,
        title=s.title,
        message_count=s.message_count,
        last_message_at=s.last_message_at,
        created_at=s.created_at,
        is_archived=s.is_archived,
    )
