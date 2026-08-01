"""
Embeddings provider abstraction.

Default: Sentence-Transformers (local, free, no API key needed).
Optional: OpenAI embeddings, if EMBEDDING_PROVIDER=openai and OPENAI_API_KEY is set.

Both providers expose the same interface so the rest of the app
(vector store, document processing) never needs to know which one is active.
"""

from functools import lru_cache

from app.core.config import settings
from app.core.logging import logger


class EmbeddingProvider:
    """Common interface every embedding backend implements."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError

    def embed_query(self, text: str) -> list[float]:
        raise NotImplementedError

    @property
    def dimension(self) -> int:
        raise NotImplementedError


class SentenceTransformerEmbeddings(EmbeddingProvider):
    """Local, free embeddings using the sentence-transformers library."""

    def __init__(self, model_name: str):
        from sentence_transformers import SentenceTransformer

        logger.info(f"Loading local embedding model: {model_name}")
        self._model = SentenceTransformer(model_name)
        self._dimension = self._model.get_sentence_embedding_dimension()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        vectors = self._model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return vectors.tolist()

    def embed_query(self, text: str) -> list[float]:
        vector = self._model.encode([text], convert_to_numpy=True, show_progress_bar=False)[0]
        return vector.tolist()

    @property
    def dimension(self) -> int:
        return self._dimension


class OpenAIEmbeddings(EmbeddingProvider):
    """OpenAI embeddings (text-embedding-3-small by default). Requires OPENAI_API_KEY."""

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        from openai import OpenAI

        self._client = OpenAI(api_key=api_key)
        self._model = model
        # text-embedding-3-small = 1536 dims, text-embedding-3-large = 3072
        self._dimension = 3072 if "large" in model else 1536

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        response = self._client.embeddings.create(model=self._model, input=texts)
        return [item.embedding for item in response.data]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]

    @property
    def dimension(self) -> int:
        return self._dimension


@lru_cache
def get_embedding_provider() -> EmbeddingProvider:
    """
    Cached factory — the embedding model is loaded once per process.
    Returns FakeEmbeddingProvider in testing mode to avoid downloading ML models.
    """
    if settings.APP_ENV == "testing":
        from app.tests.fakes import FakeEmbeddingProvider
        return FakeEmbeddingProvider()

    if settings.EMBEDDING_PROVIDER == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError(
                "EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is not set in .env"
            )
        return OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY)

    return SentenceTransformerEmbeddings(model_name=settings.EMBEDDING_MODEL)
