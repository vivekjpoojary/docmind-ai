"""Business logic for usage analytics (per-user dashboard + admin platform view)."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.conversation_repository import ConversationRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.user_repository import UserRepository
from app.schemas.analytics import AdminAnalytics, UserAnalytics


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.documents = DocumentRepository(db)
        self.conversations = ConversationRepository(db)
        self.users = UserRepository(db)

    async def get_user_analytics(self, owner_id: str) -> UserAnalytics:
        storage_stats = await self.documents.get_owner_storage_stats(owner_id)
        total_conversations = await self.conversations.count_conversations_for_owner(owner_id)
        total_questions = await self.conversations.count_user_questions_for_owner(owner_id)

        return UserAnalytics(
            total_documents=storage_stats["total_documents"],
            total_pages=storage_stats["total_pages"],
            total_chunks=storage_stats["total_chunks"],
            storage_bytes=storage_stats["storage_bytes"],
            total_conversations=total_conversations,
            total_questions_asked=total_questions,
        )

    async def get_admin_analytics(self) -> AdminAnalytics:
        platform_stats = await self.documents.get_platform_stats()
        total_conversations = await self.conversations.count_platform_conversations()
        total_questions = await self.conversations.count_platform_questions()
        all_users = await self.users.list_all()

        return AdminAnalytics(
            total_users=len(all_users),
            total_documents=platform_stats["total_documents"],
            total_conversations=total_conversations,
            total_questions_asked=total_questions,
            total_storage_bytes=platform_stats["total_storage_bytes"],
            documents_by_status=platform_stats["documents_by_status"],
        )
