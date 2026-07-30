"""
Chunking strategy: recursive character splitting (paragraph -> sentence ->
word boundaries), preserving which source page each chunk came from.

Uses LangChain's RecursiveCharacterTextSplitter for the actual splitting
logic (well-tested boundary handling), but wraps it so every chunk retains
its page number for later citation.
"""

from dataclasses import dataclass

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:  # older/newer langchain versions keep this in different places
    from langchain.text_splitter import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.rag.loaders import PageContent


@dataclass
class Chunk:
    chunk_index: int
    page_number: int
    content: str


def chunk_pages(pages: list[PageContent]) -> list[Chunk]:
    """
    Split each page's text into overlapping chunks sized per settings
    (CHUNK_SIZE / CHUNK_OVERLAP), keeping the page number attached to
    every resulting chunk.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks: list[Chunk] = []
    running_index = 0
    for page in pages:
        pieces = splitter.split_text(page.text)
        for piece in pieces:
            piece = piece.strip()
            if not piece:
                continue
            chunks.append(
                Chunk(chunk_index=running_index, page_number=page.page_number, content=piece)
            )
            running_index += 1
    return chunks
