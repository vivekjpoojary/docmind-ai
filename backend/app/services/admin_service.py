"""
Admin service: user and document management for platform administrators.

User deletion deliberately reuses DocumentService.delete() for each of the
user's documents first — that's what cleans up FAISS vectors and on-disk
files, which a raw SQL cascade delete would silently skip.
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.user_repository import UserRepository
from app.schemas.analytics import AdminUserRead
from app.services.document_service import DocumentService


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(db)
        self.documents = DocumentRepository(db)
        self.conversations = ConversationRepository(db)
        self.document_service = DocumentService(db)

    async def list_users(self) -> list[AdminUserRead]:
        all_users = await self.users.list_all()
        doc_counts = await self.documents.get_document_count_by_owner()
        return [
            AdminUserRead(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                is_active=u.is_active,
                is_admin=u.is_admin,
                created_at=u.created_at,
                document_count=doc_counts.get(u.id, 0),
            )
            for u in all_users
        ]

    async def delete_user(self, user_id: str, requesting_admin_id: str) -> None:
        if user_id == requesting_admin_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own account through this endpoint.",
            )

        user = await self.users.get_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        # Clean up documents properly first (FAISS vectors + files on disk),
        # then let the ORM cascade handle conversations/messages.
        user_documents = await self.documents.list_for_owner(user_id)
        for document in user_documents:
            await self.document_service.delete(document)

        await self.users.delete(user)
        logger.info(f"Admin deleted user {user.email} (id={user_id})")

    async def delete_document_as_admin(self, document_id: str) -> None:
        document = await self.documents.get_by_id(document_id)
        if document is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        await self.document_service.delete(document)
