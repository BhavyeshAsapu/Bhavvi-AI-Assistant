"""
LangGraph StateGraph — wires all agents into the multi-agent execution graph.

Graph structure:
  START → planner → memory → [general | vision | rag] (parallel) → response → END

The planner's output (agents_to_run) is used by each agent node to short-circuit
if they're not needed for the current request — this avoids conditional edge
complexity while keeping all nodes simple.
"""

from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from agents.general_agent import general_agent_node
from agents.memory_agent import memory_node
from agents.planner import planner_node
from agents.rag_agent import rag_agent_node
from agents.response_agent import response_agent_node
from agents.state import AgentState
from agents.vision_agent import vision_agent_node
from core.logging import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def build_agent_graph():
    """Build and compile the LangGraph multi-agent StateGraph.

    Returns the compiled graph. Cached after first call since the graph
    structure never changes at runtime.
    """
    builder = StateGraph(AgentState)

    # ── Register nodes ────────────────────────────────────────────────────────
    builder.add_node("planner", planner_node)
    builder.add_node("memory", memory_node)
    builder.add_node("general", general_agent_node)
    builder.add_node("vision", vision_agent_node)
    builder.add_node("rag", rag_agent_node)
    builder.add_node("response", response_agent_node)

    # ── Sequential edges ──────────────────────────────────────────────────────
    builder.add_edge(START, "planner")
    builder.add_edge("planner", "memory")

    # All three specialist agents run after memory (in parallel via LangGraph)
    builder.add_edge("memory", "general")
    builder.add_edge("memory", "vision")
    builder.add_edge("memory", "rag")

    # All converge at response agent
    builder.add_edge("general", "response")
    builder.add_edge("vision", "response")
    builder.add_edge("rag", "response")

    builder.add_edge("response", END)

    graph = builder.compile()
    logger.info("agent_graph_compiled")
    return graph


async def run_agent_graph(initial_state: AgentState) -> AgentState:
    """Execute the agent graph with the given initial state.

    Args:
        initial_state: The populated initial AgentState.

    Returns:
        Final AgentState after all agents have executed.
    """
    graph = build_agent_graph()
    final_state = await graph.ainvoke(initial_state)
    return final_state
