"""Question-answering endpoint — the core RAG feature."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.ask import AskRequest, AskResponse
from app.services.rag_service import RAGService

router = APIRouter(tags=["Question Answering"])


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ask a natural-language question about the user's uploaded documents.
    Returns a grounded answer with source citations (document + page) and
    a confidence score. If no sufficiently relevant content is found, the
    answer will explicitly say so rather than guessing.
    """
    service = RAGService(db)
    return await service.ask(current_user.id, request)
