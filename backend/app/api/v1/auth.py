"""Authentication endpoints."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.middleware.rate_limit import limiter
from app.models.user import User
from app.schemas.auth import Token, TokenRefreshRequest, UserCreate, UserLogin, UserRead
from app.services.auth_service import AuthService

router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """Create a new user account."""
    user = await AuthService(db).register(payload)
    return user


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate and receive an access + refresh token pair."""
    return await AuthService(db).login(payload)


@router.post("/refresh", response_model=Token)
async def refresh_token(payload: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a new access/refresh pair."""
    return await AuthService(db).refresh(payload.refresh_token)


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Stateless JWT logout: the client discards its tokens.
    (For true server-side revocation, add a token-blocklist table/Redis set
    keyed by JTI — noted in ARCHITECTURE.md as a future improvement.)
    """
    return None
