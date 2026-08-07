"""
RAG Agent — document question-answering with source citations.

Retrieves relevant chunks from ChromaDB, constructs a context-grounded prompt,
and generates a cited answer using Gemini Pro. Returns both the answer and
the source citations for display in the UI.
"""

from langchain_google_genai import ChatGoogleGenerativeAI

from agents.state import AgentState
from config.settings import get_settings
from core.logging import get_logger
from models.message import SourceCitation
from rag.retriever import retrieve_relevant_chunks

logger = get_logger(__name__)

_RAG_SYSTEM_PROMPT = """You are Bhavvi AI's Document Intelligence Specialist.

Answer the user's question using ONLY the provided context from their uploaded documents.

Rules:
1. Base your answer exclusively on the provided context.
2. If the context doesn't contain enough information to answer, say so clearly.
3. Do not hallucinate or add information not present in the context.
4. Cite specific parts of the context when referencing information.
5. Format your response with Markdown.
6. Be thorough but concise.

Context from documents:
{context}

User question: {question}"""


async def rag_agent_node(state: AgentState) -> AgentState:
    """LangGraph node: retrieve document context and generate a cited answer."""
    if "rag" not in state.get("agents_to_run", []):
        return {**state, "rag_response": None, "retrieved_sources": []}

    query = state.get("user_message", "")
    attached_pdfs = state.get("attached_pdfs", [])

    # Scope retrieval to attached document IDs if provided
    doc_ids = [pdf["doc_id"] for pdf in attached_pdfs] if attached_pdfs else None

    logger.info("rag_agent_retrieving", query_preview=query[:60], doc_ids=doc_ids)

    # Step 1: Retrieve relevant chunks
    sources: list[SourceCitation] = await retrieve_relevant_chunks(
        query=query,
        doc_ids=doc_ids,
        top_k=6,
    )

    if not sources:
        logger.info("rag_agent_no_sources_found")
        return {
            **state,
            "rag_response": (
                "I couldn't find relevant information in the uploaded documents "
                "to answer your question. Please ensure the document has been "
                "fully indexed (status: Ready) before asking questions about it."
            ),
            "retrieved_sources": [],
        }

    # Step 2: Build context string from retrieved chunks
    context_parts = []
    for i, source in enumerate(sources, 1):
        context_parts.append(
            f"[Source {i} — {source.filename} "
            f"(relevance: {source.relevance_score:.0%})]\n{source.chunk_text}"
        )
    context = "\n\n---\n\n".join(context_parts)

    # Step 3: Generate grounded answer
    settings = get_settings()
    llm = ChatGoogleGenerativeAI(
        model=settings.gemini_model_pro,
        google_api_key=settings.gemini_api_key,
        temperature=0.2,  # Lower temperature for factual, grounded responses
    )

    prompt = _RAG_SYSTEM_PROMPT.format(context=context, question=query)
    response = await llm.ainvoke([("human", prompt)])

    logger.info("rag_agent_complete", sources=len(sources))

    return {
        **state,
        "rag_response": response.content,
        "retrieved_sources": sources,
    }
