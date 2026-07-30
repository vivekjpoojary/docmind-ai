"""Pydantic schemas for the question-answering (RAG) endpoint."""

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = None
    document_ids: list[str] | None = Field(
        default=None,
        description="Optional: restrict retrieval to these document IDs only.",
    )
    top_k: int | None = Field(default=None, ge=1, le=20)


class SourceCitation(BaseModel):
    document_id: str
    filename: str
    page_number: int | None
    excerpt: str
    relevance_score: float


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceCitation]
    confidence: float
    conversation_id: str
    found_relevant_context: bool
