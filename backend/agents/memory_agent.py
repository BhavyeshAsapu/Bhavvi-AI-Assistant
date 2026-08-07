"""
Memory Agent — fetches recent conversation history from MongoDB.

Populates state["conversation_history"] so all downstream agents have
the context of previous turns without repeatedly querying the database.
"""

from agents.state import AgentState
from core.logging import get_logger
from services.message_service import get_recent_messages

logger = get_logger(__name__)

_HISTORY_WINDOW = 10  # Number of recent turns to load


async def memory_node(state: AgentState) -> AgentState:
    """LangGraph node: load recent conversation history."""
    session_id = state.get("session_id", "")

    if not session_id:
        logger.warning("memory_node_no_session_id")
        return {**state, "conversation_history": []}

    history = await get_recent_messages(session_id, limit=_HISTORY_WINDOW)
    logger.info(
        "memory_loaded",
        session_id=session_id,
        turns=len(history),
    )
    return {**state, "conversation_history": history}
