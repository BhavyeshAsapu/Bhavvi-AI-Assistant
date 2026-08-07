"""
Chat API — the primary endpoint for AI conversation.

POST /chat         — non-streaming chat (returns full response at once)
GET  /chat/stream  — SSE streaming chat (token-by-token)

Both endpoints:
1. Prepare the agent state (load attached files into base64/metadata)
2. Run the multi-agent LangGraph graph
3. Persist the user + assistant messages to MongoDB
4. Return the structured response
"""

import json
import time
from pathlib import Path

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse

from agents.graph import run_agent_graph
from agents.state import AgentState
from config.settings import get_settings
from core.dependencies import get_current_user
from core.logging import get_logger
from models.message import MessageRole
from models.user import UserPublic
from schemas.chat import ChatRequest, ChatResponse, StreamChunk
from services import message_service, session_service
from services.file_service import get_document
from services.image_service import prepare_image_for_vision

logger = get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])
settings = get_settings()


async def _build_agent_state(
    payload: ChatRequest,
    user: UserPublic,
) -> AgentState:
    """Build the initial AgentState from the chat request.

    Resolves file IDs → loads images as base64 / PDFs as metadata.
    """
    attached_images: list[dict] = []
    attached_pdfs: list[dict] = []

    for file_id in payload.file_ids:
        try:
            doc = await get_document(file_id, user.id)
            abs_path = settings.upload_path / doc.storage_path

            if doc.document_type == "image":
                b64, mime = prepare_image_for_vision(Path(abs_path))
                attached_images.append(
                    {
                        "file_id": file_id,
                        "base64": b64,
                        "mime_type": mime,
                        "original_filename": doc.original_filename,
                    }
                )
            elif doc.document_type == "pdf":
                attached_pdfs.append(
                    {
                        "file_id": file_id,
                        "doc_id": doc.id,
                        "original_filename": doc.original_filename,
                        "storage_path": str(abs_path),
                    }
                )
        except Exception as exc:
            logger.warning("file_load_failed", file_id=file_id, error=str(exc))

    return AgentState(
        user_message=payload.message,
        session_id=payload.session_id,
        user_id=user.id,
        file_ids=payload.file_ids,
        attached_images=attached_images,
        attached_pdfs=attached_pdfs,
        general_response=None,
        vision_response=None,
        rag_response=None,
        retrieved_sources=[],
        conversation_history=[],
        agents_to_run=[],
    )


@router.post(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ChatResponse,
    summary="Send a message and receive a full response",
)
async def chat(
    payload: ChatRequest,
    current_user: UserPublic = Depends(get_current_user),
) -> ChatResponse:
    """Execute the multi-agent pipeline and return the complete response."""
    t_start = time.monotonic()

    # Validate session ownership
    await session_service.get_session(payload.session_id, current_user.id)

    # Persist user message
    user_msg = await message_service.save_message(
        session_id=payload.session_id,
        user_id=current_user.id,
        role=MessageRole.USER,
        content=payload.message,
    )

    # Build initial state and run the graph
    initial_state = await _build_agent_state(payload, current_user)
    final_state = await run_agent_graph(initial_state)

    # Persist assistant response
    assistant_msg = await message_service.save_message(
        session_id=payload.session_id,
        user_id=current_user.id,
        role=MessageRole.ASSISTANT,
        content=final_state.get("final_response", ""),
        sources=final_state.get("final_sources", []),
        agent_trace=final_state.get("agent_trace"),
    )

    # Update session counters (user + assistant = 2 messages)
    await session_service.increment_message_count(payload.session_id)
    await session_service.increment_message_count(payload.session_id)

    elapsed = int((time.monotonic() - t_start) * 1000)
    logger.info("chat_complete", elapsed_ms=elapsed, session_id=payload.session_id)

    return ChatResponse(
        message_id=assistant_msg.id,
        session_id=payload.session_id,
        role=MessageRole.ASSISTANT,
        content=final_state.get("final_response", ""),
        sources=final_state.get("final_sources", []),
        agent_trace=final_state.get("agent_trace"),
    )


@router.post(
    "/stream",
    summary="Send a message and receive a streaming response (SSE)",
    response_class=StreamingResponse,
)
async def chat_stream(
    payload: ChatRequest,
    current_user: UserPublic = Depends(get_current_user),
):
    """Execute the multi-agent pipeline and stream the response via SSE.

    The SSE stream sends chunks of type:
    - "token"   — a partial response text chunk
    - "sources" — the full list of source citations (sent once at end)
    - "trace"   — agent execution metadata
    - "done"    — signals stream completion
    - "error"   — signals an error
    """
    await session_service.get_session(payload.session_id, current_user.id)

    await message_service.save_message(
        session_id=payload.session_id,
        user_id=current_user.id,
        role=MessageRole.USER,
        content=payload.message,
    )

    async def event_stream():
        try:
            initial_state = await _build_agent_state(payload, current_user)

            # Run full graph (non-streaming internally, streamed to client)
            # For true token-level streaming, Gemini streaming would be integrated here
            final_state = await run_agent_graph(initial_state)

            response_text = final_state.get("final_response", "")
            sources = final_state.get("final_sources", [])
            trace = final_state.get("agent_trace")

            # Simulate streaming by chunking the response into word-level pieces
            words = response_text.split(" ")
            chunk_size = 5  # Words per SSE event
            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i : i + chunk_size])
                if i + chunk_size < len(words):
                    chunk += " "
                event = StreamChunk(type="token", content=chunk)
                yield f"data: {event.model_dump_json()}\n\n"

            # Persist the complete assistant message
            assistant_msg = await message_service.save_message(
                session_id=payload.session_id,
                user_id=current_user.id,
                role=MessageRole.ASSISTANT,
                content=response_text,
                sources=sources,
                agent_trace=trace,
            )
            await session_service.increment_message_count(payload.session_id)
            await session_service.increment_message_count(payload.session_id)

            # Send sources
            if sources:
                sources_event = StreamChunk(
                    type="sources",
                    sources=sources,
                    message_id=assistant_msg.id,
                )
                yield f"data: {sources_event.model_dump_json()}\n\n"

            # Send trace
            if trace:
                trace_event = StreamChunk(
                    type="trace",
                    agent_trace=trace,
                    message_id=assistant_msg.id,
                )
                yield f"data: {trace_event.model_dump_json()}\n\n"

            # Done signal
            done_event = StreamChunk(type="done", message_id=assistant_msg.id)
            yield f"data: {done_event.model_dump_json()}\n\n"

        except Exception as exc:
            logger.error("chat_stream_error", error=str(exc))
            error_event = StreamChunk(type="error", content=str(exc))
            yield f"data: {error_event.model_dump_json()}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
