"""
Planner Agent — the orchestration brain of the multi-agent system.

Analyzes every user request and decides which downstream agents to invoke.
Uses a combination of rule-based heuristics (fast, zero-cost) and an LLM
fallback for ambiguous cases.

Agent routing decisions:
  - Has image attachments      → always include "vision"
  - Has PDF attachments        → always include "rag"
  - General question only      → "general"
  - Mixed content              → combination

The planner always includes "memory" to provide conversation context.
"""

import json

from langchain_google_genai import ChatGoogleGenerativeAI

from agents.state import AgentState
from config.settings import get_settings
from core.logging import get_logger

logger = get_logger(__name__)

_PLANNER_PROMPT = """You are the Planner Agent for Bhavvi AI Assistant.

Analyze the user's message and attached files, then decide which agents to invoke.

Available agents:
- "general"  — for general chat, coding, writing, brainstorming, explanations
- "vision"   — for analyzing images, charts, diagrams, screenshots
- "rag"      — for answering questions about uploaded PDFs/documents
- "memory"   — always include to provide conversation context

User message: {user_message}
Has images: {has_images}
Has PDFs: {has_pdfs}
Recent conversation turns: {num_history_turns}

Respond ONLY with valid JSON matching this schema:
{{
  "intent": "brief description of what the user wants",
  "agents_to_run": ["memory", "general|vision|rag", ...],
  "reasoning": "one sentence explaining your routing decision"
}}"""


def _rule_based_routing(state: AgentState) -> dict | None:
    """Apply fast, deterministic routing rules.

    Returns a routing decision dict if rules apply, else None (triggers LLM fallback).
    """
    has_images = bool(state.get("attached_images"))
    has_pdfs = bool(state.get("attached_pdfs"))
    message = (state.get("user_message") or "").lower()

    agents = ["memory"]

    if has_images and has_pdfs:
        agents.extend(["vision", "rag"])
        return {
            "intent": "multimodal query with images and documents",
            "agents_to_run": agents,
            "planner_reasoning": "Both images and PDFs attached — routing to Vision + RAG agents.",
        }

    if has_images and not has_pdfs:
        agents.append("vision")
        return {
            "intent": "visual analysis request",
            "agents_to_run": agents,
            "planner_reasoning": "Image(s) attached — routing to Vision Agent.",
        }

    if has_pdfs and not has_images:
        agents.append("rag")
        return {
            "intent": "document question-answering",
            "agents_to_run": agents,
            "planner_reasoning": "PDF(s) attached — routing to RAG Agent.",
        }

    # Keyword heuristics for document queries without attached files
    doc_keywords = {"document", "pdf", "file", "uploaded", "paper", "summarize the"}
    if any(kw in message for kw in doc_keywords):
        agents.append("rag")
        return {
            "intent": "document-related query",
            "agents_to_run": agents,
            "planner_reasoning": "Message references documents — routing to RAG Agent.",
        }

    return None  # Fall through to LLM


async def planner_node(state: AgentState) -> AgentState:
    """LangGraph node: analyze the request and set routing decisions."""
    import time
    start = time.monotonic()

    # Try fast rule-based routing first
    routing = _rule_based_routing(state)

    if routing is None:
        # Fallback to LLM for ambiguous cases
        settings = get_settings()
        llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model_flash,
            google_api_key=settings.gemini_api_key,
            temperature=0.1,
        )
        prompt = _PLANNER_PROMPT.format(
            user_message=state.get("user_message", ""),
            has_images=bool(state.get("attached_images")),
            has_pdfs=bool(state.get("attached_pdfs")),
            num_history_turns=len(state.get("conversation_history", [])),
        )
        try:
            response = await llm.ainvoke(prompt)
            raw = response.content.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
            routing = json.loads(raw)
            # Ensure memory is always included
            if "memory" not in routing.get("agents_to_run", []):
                routing["agents_to_run"].insert(0, "memory")
        except Exception as exc:
            logger.warning("planner_llm_fallback_failed", error=str(exc))
            routing = {
                "intent": "general conversation",
                "agents_to_run": ["memory", "general"],
                "planner_reasoning": f"LLM fallback failed, defaulting to general: {exc}",
            }

    elapsed_ms = int((time.monotonic() - start) * 1000)
    logger.info(
        "planner_decision",
        intent=routing.get("intent"),
        agents=routing.get("agents_to_run"),
        elapsed_ms=elapsed_ms,
    )

    return {
        **state,
        "intent": routing.get("intent", ""),
        "agents_to_run": routing.get("agents_to_run", ["memory", "general"]),
        "planner_reasoning": routing.get("reasoning", routing.get("planner_reasoning", "")),
    }
