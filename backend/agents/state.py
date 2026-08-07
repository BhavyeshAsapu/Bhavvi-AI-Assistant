"""
LangGraph shared agent state.

All agents in the graph read from and write to this TypedDict.
It serves as the single source of truth for a request's lifecycle.
"""

from typing import Any, TypedDict

from models.message import AgentTrace, SourceCitation


class AgentState(TypedDict, total=False):
    """Shared state passed between all nodes in the LangGraph graph.

    Fields are populated progressively as the graph executes:
    - Input fields are set by the entry point.
    - Agent-specific fields are set by each agent node.
    - Output fields are set by the Response Agent.
    """

    # ── Input (set before graph starts) ──────────────────────────────────────
    user_message: str           # The raw user query
    session_id: str             # Current chat session
    user_id: str                # Authenticated user
    file_ids: list[str]         # IDs of attached files (empty if none)
    attached_images: list[dict] # [{file_id, base64, mime_type}]
    attached_pdfs: list[dict]   # [{file_id, doc_id, original_filename, path}]

    # ── Planner output ────────────────────────────────────────────────────────
    intent: str                 # Planner's classification of the request
    agents_to_run: list[str]    # Which agent nodes to invoke
    planner_reasoning: str      # Planner's explanation

    # ── Memory Agent output ───────────────────────────────────────────────────
    conversation_history: list[dict]  # Recent messages [{role, content}]

    # ── General Agent output ──────────────────────────────────────────────────
    general_response: str | None

    # ── Vision Agent output ───────────────────────────────────────────────────
    vision_response: str | None
    vision_analysis: dict[str, Any]  # Structured analysis results

    # ── RAG Agent output ──────────────────────────────────────────────────────
    rag_response: str | None
    retrieved_sources: list[SourceCitation]

    # ── Response Agent output (final) ────────────────────────────────────────
    final_response: str
    final_sources: list[SourceCitation]
    agent_trace: AgentTrace

    # ── Error handling ────────────────────────────────────────────────────────
    error: str | None
