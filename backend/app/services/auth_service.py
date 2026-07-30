"""Business logic for authentication: registration, login, token refresh."""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    get_subject_from_token,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import Token, UserCreate, UserLogin


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(db)

    async def register(self, data: UserCreate) -> User:
        existing = await self.users.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )
        # First registered user becomes admin — convenient for local/demo setups.
        is_first_user = len(await self.users.list_all()) == 0
        user = await self.users.create(data, is_admin=is_first_user)
        logger.info(f"New user registered: {user.email} (admin={user.is_admin})")
        return user

    async def login(self, data: UserLogin) -> Token:
        user = await self.users.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated.",
            )
        return Token(
            access_token=create_access_token(user.id, {"is_admin": user.is_admin}),
            refresh_token=create_refresh_token(user.id),
        )

    async def refresh(self, refresh_token: str) -> Token:
        try:
            user_id = get_subject_from_token(refresh_token, expected_type="refresh")
        except TokenError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

        user = await self.users.get_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

        return Token(
            access_token=create_access_token(user.id, {"is_admin": user.is_admin}),
            refresh_token=create_refresh_token(user.id),
        )
