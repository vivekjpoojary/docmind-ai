"""Chat/conversation history endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.analytics import UserAnalytics
from app.schemas.history import ConversationDetail, ConversationRead, MessageRead
from app.services.analytics_service import AnalyticsService
from app.services.history_service import HistoryService

router = APIRouter(tags=["History & Analytics"])


@router.get("/history", response_model=list[ConversationRead])
async def list_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all of the current user's past conversations, most recent first."""
    service = HistoryService(db)
    return await service.list_for_owner(current_user.id)


@router.get("/history/{conversation_id}", response_model=ConversationDetail)
async def get_history_detail(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the full message history for one conversation."""
    service = HistoryService(db)
    conversation = await service.get_owned_or_404(conversation_id, current_user.id)
    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        messages=[MessageRead.model_validate(m) for m in conversation.messages],
    )


@router.delete("/history/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single conversation and all of its messages."""
    service = HistoryService(db)
    conversation = await service.get_owned_or_404(conversation_id, current_user.id)
    await service.delete_one(conversation)
    return None


@router.delete("/history", status_code=status.HTTP_200_OK)
async def clear_all_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear the current user's entire conversation history."""
    service = HistoryService(db)
    deleted_count = await service.delete_all(current_user.id)
    return {"deleted_conversations": deleted_count}


@router.get("/analytics", response_model=UserAnalytics)
async def get_my_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Usage stats for the current user's dashboard (documents, storage, questions asked)."""
    service = AnalyticsService(db)
    return await service.get_user_analytics(current_user.id)
