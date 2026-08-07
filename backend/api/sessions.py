"""
Sessions REST API.

GET    /sessions          — list user sessions
POST   /sessions          — create new session
GET    /sessions/{id}     — get single session + messages
PATCH  /sessions/{id}     — rename or archive
DELETE /sessions/{id}     — delete session
"""

from fastapi import APIRouter, Depends, status

from core.dependencies import get_current_user
from models.user import UserPublic
from schemas.chat import CreateSessionRequest, UpdateSessionRequest
from services import message_service, session_service

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("", summary="List all chat sessions for the current user")
async def list_sessions(current_user: UserPublic = Depends(get_current_user)):
    sessions = await session_service.get_user_sessions(current_user.id)
    return {"sessions": [s.model_dump() for s in sessions]}


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new chat session")
async def create_session(
    payload: CreateSessionRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    session = await session_service.create_session(
        user_id=current_user.id, title=payload.title
    )
    return session.model_dump()


@router.get("/{session_id}", summary="Get a session with its message history")
async def get_session(
    session_id: str, current_user: UserPublic = Depends(get_current_user)
):
    session = await session_service.get_session(session_id, current_user.id)
    messages = await message_service.get_session_messages(session_id, current_user.id)
    return {
        "session": session.model_dump(),
        "messages": [m.model_dump() for m in messages],
    }


@router.patch("/{session_id}", summary="Update session title or archive status")
async def update_session(
    session_id: str,
    payload: UpdateSessionRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    session = await session_service.update_session(
        session_id=session_id,
        user_id=current_user.id,
        title=payload.title,
        is_archived=payload.is_archived,
    )
    return session.model_dump()


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a session")
async def delete_session(
    session_id: str, current_user: UserPublic = Depends(get_current_user)
):
    await session_service.delete_session(session_id, current_user.id)
