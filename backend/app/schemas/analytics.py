"""Pydantic schemas for analytics and admin endpoints."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserAnalytics(BaseModel):
    total_documents: int
    total_pages: int
    total_chunks: int
    storage_bytes: int
    total_conversations: int
    total_questions_asked: int


class AdminUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    document_count: int = 0
    storage_bytes: int = 0


class AdminAnalytics(BaseModel):
    total_users: int
    total_documents: int
    total_conversations: int
    total_questions_asked: int
    total_storage_bytes: int
    documents_by_status: dict[str, int]
