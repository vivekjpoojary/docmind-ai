"""Admin-only endpoints: user management, document moderation, platform analytics."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.database.session import get_db
from app.models.user import User
from app.schemas.analytics import AdminAnalytics, AdminUserRead
from app.services.admin_service import AdminService
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=list[AdminUserRead])
async def list_all_users(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List every user on the platform with their document counts. Admin only."""
    service = AdminService(db)
    return await service.list_users()


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a user and everything they own (documents, vectors, files,
    conversations). Admins cannot delete their own account this way. Admin only.
    """
    service = AdminService(db)
    await service.delete_user(user_id, requesting_admin_id=current_admin.id)
    return None


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_any_document(
    document_id: str,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete any user's document (moderation). Admin only."""
    service = AdminService(db)
    await service.delete_document_as_admin(document_id)
    return None


@router.get("/analytics", response_model=AdminAnalytics)
async def get_platform_analytics(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide usage statistics: users, documents, questions, storage. Admin only."""
    service = AnalyticsService(db)
    return await service.get_admin_analytics()
