"""Pydantic schemas for document endpoints."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.document import DocumentStatus


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    file_type: str
    file_size_bytes: int
    page_count: int
    chunk_count: int
    status: DocumentStatus
    error_message: str | None = None
    uploaded_at: datetime
    processed_at: datetime | None = None


class DocumentUploadResponse(BaseModel):
    document: DocumentRead
    message: str
