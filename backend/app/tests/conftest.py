import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.rag.vector_store.faiss_store as faiss_store_module
import app.services.document_service as document_service_module
import app.services.rag_service as rag_service_module
import app.services.search_service as search_service_module
from app.core.config import settings
from app.database import session as session_module
from app.database.session import Base
from app.main import app
from app.tests.fakes import FakeEmbeddingProvider, FakeLLM


@pytest_asyncio.fixture
async def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test_app.db"
    faiss_dir = tmp_path / "faiss_index"
    upload_dir = tmp_path / "uploads"

    monkeypatch.setattr(settings, "DATABASE_URL", f"sqlite+aiosqlite:///{db_path}")
    monkeypatch.setattr(settings, "FAISS_INDEX_DIR", str(faiss_dir))
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(upload_dir))

    engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )

    monkeypatch.setattr(session_module, "engine", engine)
    monkeypatch.setattr(session_module, "AsyncSessionLocal", session_factory)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    fake_embedder = FakeEmbeddingProvider()
    monkeypatch.setattr(document_service_module, "get_embedding_provider", lambda: fake_embedder)
    monkeypatch.setattr(rag_service_module, "get_embedding_provider", lambda: fake_embedder)
    monkeypatch.setattr(faiss_store_module, "get_embedding_provider", lambda: fake_embedder)
    monkeypatch.setattr(search_service_module, "get_embedding_provider", lambda: fake_embedder)
    monkeypatch.setattr(rag_service_module, "get_llm_provider", lambda: FakeLLM())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client

    await engine.dispose()


@pytest_asyncio.fixture
async def auth_headers(client):
    register_payload = {
        "email": "ragtest@example.com",
        "full_name": "RAG Test User",
        "password": "supersecret123",
    }
    await client.post("/api/v1/register", json=register_payload)
    token_response = await client.post(
        "/api/v1/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    token = token_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}