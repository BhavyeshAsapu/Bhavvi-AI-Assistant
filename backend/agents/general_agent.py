"""
General Agent — handles general chat, coding, writing, and explanations.

Uses Gemini 2.5 Flash for speed and cost efficiency on non-specialist tasks.
Injects conversation history to maintain coherent multi-turn dialogue.
"""

from langchain_google_genai import ChatGoogleGenerativeAI

from agents.state import AgentState
from config.settings import get_settings
from core.logging import get_logger

logger = get_logger(__name__)

_SYSTEM_PROMPT = """You are Bhavvi AI, a highly capable and helpful AI assistant.

You are knowledgeable, concise, and friendly. You can help with:
- General questions and explanations
- Programming and debugging
- Writing, editing, and summarization
- Brainstorming and creative tasks
- Mathematical reasoning
- Research and analysis

Format your responses using Markdown where appropriate.
Use code blocks for code. Use tables for comparisons. Be concise but thorough."""


async def general_agent_node(state: AgentState) -> AgentState:
    """LangGraph node: generate a response for general queries."""
    if "general" not in state.get("agents_to_run", []):
        return state

    settings = get_settings()
    llm = ChatGoogleGenerativeAI(
        model=settings.gemini_model_flash,
        google_api_key=settings.gemini_api_key,
        temperature=0.7,
    )

    # Build messages list for multi-turn context
    messages = [("system", _SYSTEM_PROMPT)]

    # Inject recent history
    for turn in state.get("conversation_history", []):
        role = "human" if turn["role"] == "user" else "assistant"
        messages.append((role, turn["content"]))

    # Current user message
    messages.append(("human", state.get("user_message", "")))

    logger.info(
        "general_agent_invoke",
        history_turns=len(state.get("conversation_history", [])),
    )

    response = await llm.ainvoke(messages)
    return {**state, "general_response": response.content}
