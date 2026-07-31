"""Pydantic schemas for chat history endpoints."""

import json
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    role: str
    content: str
    sources: list[dict] | None = Field(default=None, validation_alias="sources_json")
    confidence: float | None = None
    created_at: datetime

    @field_validator("sources", mode="before")
    @classmethod
    def _parse_sources_json(cls, value):
        """The ORM stores citations as sources_json (a JSON string); decode it here."""
        if isinstance(value, str):
            return json.loads(value)
        return value


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime


class ConversationDetail(ConversationRead):
    messages: list[MessageRead]
