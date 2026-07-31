"""Pydantic schemas for the search endpoint (semantic / keyword / hybrid)."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class SearchMode(str, Enum):
    SEMANTIC = "semantic"
    KEYWORD = "keyword"
    HYBRID = "hybrid"


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    mode: SearchMode = SearchMode.HYBRID
    document_ids: list[str] | None = Field(
        default=None, description="Optional: restrict search to these document IDs."
    )
    uploaded_after: datetime | None = None
    uploaded_before: datetime | None = None
    top_k: int = Field(default=10, ge=1, le=50)


class SearchResultItem(BaseModel):
    document_id: str
    filename: str
    page_number: int | None
    excerpt: str
    score: float
    match_type: str  # "semantic" | "keyword" | "both"


class SearchResponse(BaseModel):
    query: str
    mode: SearchMode
    results: list[SearchResultItem]
