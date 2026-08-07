"""
Gemini Embeddings wrapper.

Wraps langchain-google-genai's GoogleGenerativeAIEmbeddings with retry logic
and batch processing to stay within API rate limits.
"""

from functools import lru_cache

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import get_settings
from core.logging import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def get_embeddings_model() -> GoogleGenerativeAIEmbeddings:
    """Return the singleton Gemini embeddings model."""
    settings = get_settings()
    return GoogleGenerativeAIEmbeddings(
        model=settings.gemini_embedding_model,
        google_api_key=settings.gemini_api_key,
    )


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)
async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of text chunks using Gemini's embedding model.

    Batches are processed in groups of 100 to respect API limits.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors (float lists).
    """
    model = get_embeddings_model()
    all_embeddings: list[list[float]] = []

    batch_size = 100
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        logger.debug("embedding_batch", batch_index=i // batch_size, size=len(batch))
        embeddings = await model.aembed_documents(batch)
        all_embeddings.extend(embeddings)

    return all_embeddings


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10), reraise=True)
async def embed_query(query: str) -> list[float]:
    """Embed a single query string for similarity search."""
    model = get_embeddings_model()
    return await model.aembed_query(query)
