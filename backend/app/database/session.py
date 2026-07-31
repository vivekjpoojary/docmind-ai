"""
Async SQLAlchemy engine and session management.
"""

from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


def _ensure_sqlite_dir_exists(database_url: str) -> None:
    """
    For file-based SQLite URLs (sqlite+aiosqlite:///./data/app.db), make sure
    the parent directory exists before the engine tries to open the file.
    No-op for in-memory URLs or non-SQLite databases.
    """
    if not database_url.startswith("sqlite"):
        return
    # Strip the "sqlite+aiosqlite:///" (or "sqlite:///") prefix to get the path
    path_part = database_url.split("///", 1)[-1]
    if path_part in (":memory:", ""):
        return
    db_path = Path(path_part)
    db_path.parent.mkdir(parents=True, exist_ok=True)


_ensure_sqlite_dir_exists(settings.DATABASE_URL)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables and seed default admin account if empty."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed initial Admin user if no user exists
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        from app.models.user import User
        from app.core.security import get_password_hash

        result = await session.execute(select(User))
        users = result.scalars().all()
        if not users:
            admin_user = User(
                email="admin@gmail.com",
                hashed_password=get_password_hash("adminpassword"),
                full_name="System Admin",
                is_admin=True,
                is_active=True,
            )
            session.add(admin_user)
            await session.commit()

