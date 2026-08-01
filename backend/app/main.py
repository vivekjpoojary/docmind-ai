"""
Application entrypoint.

Run locally with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.admin import router as admin_router
from app.api.v1.ask import router as ask_router
from app.api.v1.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.history import router as history_router
from app.api.v1.search import router as search_router
from app.core.config import settings
from app.core.logging import logger
from app.database.session import init_db
from app.middleware.error_handler import register_exception_handlers
from app.middleware.rate_limit import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Application shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise RAG-powered document Q&A platform.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Rate limiting ----------------
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


async def rate_limit_handler(request, exc: RateLimitExceeded):
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=429,
        content={"error": True, "message": "Rate limit exceeded. Please slow down."},
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# ---------------- Global exception handlers ----------------
register_exception_handlers(app)

# ---------------- Routers ----------------
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
app.include_router(ask_router, prefix=settings.API_V1_PREFIX)
app.include_router(history_router, prefix=settings.API_V1_PREFIX)
app.include_router(search_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)


@app.get("/api/health", tags=["System"])
async def health_check():
    """Lightweight liveness/readiness probe for Docker/K8s/monitoring."""
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}
