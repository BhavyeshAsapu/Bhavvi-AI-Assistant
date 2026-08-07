"""
PDF processing service — text extraction, cleaning, and chunking.

Uses PyPDF for text extraction and LangChain's RecursiveCharacterTextSplitter
for semantic chunking. Returns clean text chunks ready for embedding.
"""

from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from core.logging import get_logger

logger = get_logger(__name__)

_CHUNK_SIZE = 1000      # characters per chunk
_CHUNK_OVERLAP = 200    # characters of overlap between chunks


def extract_and_chunk_pdf(file_path: Path) -> tuple[list[str], int]:
    """Extract text from a PDF and split into overlapping chunks.

    Args:
        file_path: Absolute path to the PDF file.

    Returns:
        Tuple of (list_of_text_chunks, page_count).

    Raises:
        ValueError: If the PDF has no extractable text (e.g., scanned images).
    """
    reader = PdfReader(str(file_path))
    page_count = len(reader.pages)

    raw_pages: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        raw_pages.append(text)

    full_text = "\n\n".join(raw_pages)
    cleaned = _clean_text(full_text)

    if not cleaned.strip():
        raise ValueError(
            "No extractable text found in this PDF. "
            "It may be a scanned document. Please use an image upload instead."
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=_CHUNK_SIZE,
        chunk_overlap=_CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(cleaned)

    logger.info(
        "pdf_processed",
        path=str(file_path),
        pages=page_count,
        chunks=len(chunks),
    )
    return chunks, page_count


def _clean_text(text: str) -> str:
    """Normalise whitespace and remove common PDF artefacts."""
    import re
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove hyphenated line breaks (word-\nwrap)
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    # Strip leading/trailing whitespace per line
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)
