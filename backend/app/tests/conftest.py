"""Shared pytest fixtures: isolated in-memory test DB + async HTTP client."""

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database.session import Base, get_db
from app.main import app
from app.tests.fakes import FakeEmbeddingProvider, FakeLLM

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, future=True)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def _setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(autouse=True)
def _fake_rag_backends(tmp_path, monkeypatch):
    """
    Replace embeddings/LLM with deterministic fakes, and redirect FAISS/upload
    storage to a per-test temp directory, so document + ask tests run fully
    offline and don't leak state between test runs.
    """
    import app.rag.vector_store.faiss_store as faiss_store_module
    import app.services.document_service as document_service_module
    import app.services.rag_service as rag_service_module
    from app.core.config import settings

    fake_embedder = FakeEmbeddingProvider()

    monkeypatch.setattr(document_service_module, "get_embedding_provider", lambda: fake_embedder)
    monkeypatch.setattr(rag_service_module, "get_embedding_provider", lambda: fake_embedder)
    monkeypatch.setattr(faiss_store_module, "get_embedding_provider", lambda: fake_embedder)
    monkeypatch.setattr(rag_service_module, "get_llm_provider", lambda: FakeLLM())

    monkeypatch.setattr(settings, "FAISS_INDEX_DIR", str(tmp_path / "faiss_index"))
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path / "uploads"))

    # The fake embedder is a crude bag-of-words hash, not a real semantic
    # model — it can't recognize "isolate" and "isolates" as related the way
    # a real embedding model would, so raw similarity scores run lower than
    # production. Lower the threshold here so these tests verify the
    # retrieval/citation/answer *pipeline wiring*, not similarity tuning.
    monkeypatch.setattr(settings, "CONFIDENCE_THRESHOLD", 0.1)


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    """Register + log in a fresh user, return Authorization headers for it."""
    payload = {"email": "ragtest@example.com", "full_name": "RAG Tester", "password": "supersecret123"}
    await client.post("/api/v1/register", json=payload)
    r = await client.post("/api/v1/login", json={"email": payload["email"], "password": payload["password"]})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}