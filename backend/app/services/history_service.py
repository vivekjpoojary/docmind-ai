"""Business logic for conversation/chat history."""

import json

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.repositories.conversation_repository import ConversationRepository


class HistoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.conversations = ConversationRepository(db)

    async def list_for_owner(self, owner_id: str) -> list[Conversation]:
        return await self.conversations.list_for_owner(owner_id)

    async def get_owned_or_404(self, conversation_id: str, owner_id: str) -> Conversation:
        conversation = await self.conversations.get_by_id(conversation_id)
        if conversation is None or conversation.owner_id != owner_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found."
            )
        return conversation

    async def delete_one(self, conversation: Conversation) -> None:
        await self.conversations.delete(conversation)

    async def delete_all(self, owner_id: str) -> int:
        return await self.conversations.delete_all_for_owner(owner_id)

    @staticmethod
    def parse_sources(sources_json: str | None) -> list[dict] | None:
        if not sources_json:
            return None
        return json.loads(sources_json)
