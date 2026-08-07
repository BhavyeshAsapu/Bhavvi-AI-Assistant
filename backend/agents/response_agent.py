"""
Response Agent — synthesizes outputs from all upstream agents.

Combines general, vision, and RAG responses into a single, cohesive,
well-formatted Markdown response. Also compiles the final source citations
and builds the AgentTrace for logging.
"""

import time

from agents.state import AgentState
from core.logging import get_logger
from models.message import AgentTrace, SourceCitation

logger = get_logger(__name__)


async def response_agent_node(state: AgentState) -> AgentState:
    """LangGraph node: merge agent outputs into the final response."""
    start = time.monotonic()

    agents_used = []
    response_parts: list[str] = []

    general_response = state.get("general_response")
    vision_response = state.get("vision_response")
    rag_response = state.get("rag_response")
    retrieved_sources: list[SourceCitation] = state.get("retrieved_sources", [])

    # Collect responses from active agents
    if general_response:
        agents_used.append("general")
        response_parts.append(general_response)

    if vision_response:
        agents_used.append("vision")
        if general_response:
            response_parts.append("\n\n---\n\n**🔍 Visual Analysis:**\n\n" + vision_response)
        else:
            response_parts.append(vision_response)

    if rag_response:
        agents_used.append("rag")
        prefix = "\n\n---\n\n**📄 From your documents:**\n\n" if (general_response or vision_response) else ""
        response_parts.append(prefix + rag_response)

    # Fallback if nothing was generated
    if not response_parts:
        agents_used.append("general")
        response_parts.append(
            "I'm sorry, I wasn't able to generate a response for your request. "
            "Please try rephrasing your question."
        )

    final_response = "".join(response_parts)

    # Build citation footer if sources were retrieved
    if retrieved_sources:
        agents_used.append("rag_citations")
        citation_lines = ["\n\n---\n\n**📚 Sources:**\n"]
        for i, source in enumerate(retrieved_sources, 1):
            page_info = f", page {source.page_number}" if source.page_number else ""
            citation_lines.append(
                f"{i}. **{source.filename}**{page_info} "
                f"*(relevance: {source.relevance_score:.0%})*"
            )
        final_response += "\n".join(citation_lines)

    elapsed_ms = int((time.monotonic() - start) * 1000)

    trace = AgentTrace(
        agents_used=agents_used,
        planner_decision=state.get("planner_reasoning", ""),
        execution_time_ms=elapsed_ms,
    )

    logger.info(
        "response_agent_complete",
        agents_used=agents_used,
        sources=len(retrieved_sources),
        response_length=len(final_response),
        elapsed_ms=elapsed_ms,
    )

    return {
        **state,
        "final_response": final_response,
        "final_sources": retrieved_sources,
        "agent_trace": trace,
    }
