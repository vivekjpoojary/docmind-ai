"""Question-answering endpoint — the core RAG feature."""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
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
    a confidence score.
    """
    service = RAGService(db)
    return await service.ask(current_user.id, request)


@router.post("/ask/stream")
async def ask_question_stream(
    request: AskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Real-time token streaming question-answering endpoint (Server-Sent Events).
    Yields metadata first followed by word-by-word token chunks.
    """
    service = RAGService(db)
    return StreamingResponse(
        service.ask_stream(current_user.id, request),
        media_type="text/event-stream"
    )
