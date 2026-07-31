"""Data access layer for Conversation and Message entities."""

import json

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message


class ConversationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, owner_id: str, title: str = "New conversation") -> Conversation:
        conversation = Conversation(owner_id=owner_id, title=title)
        self.db.add(conversation)
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation

    async def get_by_id(self, conversation_id: str) -> Conversation | None:
        result = await self.db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()

    async def list_for_owner(self, owner_id: str) -> list[Conversation]:
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.owner_id == owner_id)
            .order_by(Conversation.created_at.desc())
        )
        return list(result.scalars().all())

    async def delete(self, conversation: Conversation) -> None:
        await self.db.delete(conversation)
        await self.db.commit()

    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        sources: list[dict] | None = None,
        confidence: float | None = None,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            sources_json=json.dumps(sources) if sources is not None else None,
            confidence=confidence,
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def count_conversations_for_owner(self, owner_id: str) -> int:
        result = await self.db.execute(
            select(func.count(Conversation.id)).where(Conversation.owner_id == owner_id)
        )
        return result.scalar_one()

    async def count_user_questions_for_owner(self, owner_id: str) -> int:
        """Count messages with role='user' across all of this user's conversations."""
        result = await self.db.execute(
            select(func.count(Message.id))
            .join(Conversation, Conversation.id == Message.conversation_id)
            .where(Conversation.owner_id == owner_id, Message.role == "user")
        )
        return result.scalar_one()

    async def count_platform_questions(self) -> int:
        result = await self.db.execute(
            select(func.count(Message.id)).where(Message.role == "user")
        )
        return result.scalar_one()

    async def count_platform_conversations(self) -> int:
        result = await self.db.execute(select(func.count(Conversation.id)))
        return result.scalar_one()

    async def delete_all_for_owner(self, owner_id: str) -> int:
        """Delete every conversation (and cascade messages) for a user. Returns count deleted."""
        conversations = await self.list_for_owner(owner_id)
        count = len(conversations)
        for conversation in conversations:
            await self.db.delete(conversation)
        await self.db.commit()
        return count
