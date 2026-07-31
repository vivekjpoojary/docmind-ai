"""Search endpoint — semantic, keyword, and hybrid search over the user's documents."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.search import SearchRequest, SearchResponse
from app.services.search_service import SearchService

router = APIRouter(tags=["Search"])


@router.post("/search", response_model=SearchResponse)
async def search_documents(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search the current user's documents. `mode` can be:
    - `semantic`: meaning-based search via embeddings (finds related concepts,
      not just exact words)
    - `keyword`: exact substring matches
    - `hybrid` (default): both, with chunks found by both methods ranked highest

    Optionally filter by `document_ids` and/or an upload-date range.
    """
    service = SearchService(db)
    return await service.search(current_user.id, request)
