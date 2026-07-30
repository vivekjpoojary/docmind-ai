"""
Central application configuration.

All environment-driven settings are declared here as a single Pydantic
Settings object. Every other module should import `settings` from this
file rather than reading `os.environ` directly — this keeps configuration
centralized, typed, and testable.
"""

from functools import lru_cache
from typing import List, Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---------------- Application ----------------
    APP_NAME: str = "DocMind AI"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ---------------- Security ----------------
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ---------------- Database ----------------
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/app.db"

    # ---------------- Vector Store ----------------
    VECTOR_STORE_PROVIDER: Literal["faiss", "chroma"] = "faiss"
    FAISS_INDEX_DIR: str = "./data/faiss_index"
    CHROMA_PERSIST_DIR: str = "./data/chroma"

    # ---------------- Embeddings ----------------
    EMBEDDING_PROVIDER: Literal["sentence_transformers", "openai"] = "sentence_transformers"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ---------------- LLM ----------------
    LLM_PROVIDER: Literal["ollama", "openai"] = "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # ---------------- RAG ----------------
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 150
    TOP_K_RESULTS: int = 5
    CONFIDENCE_THRESHOLD: float = 0.55

    # ---------------- File Upload ----------------
    MAX_UPLOAD_SIZE_MB: int = 25
    # NOTE: kept as raw comma-separated strings (not List[str]) on purpose.
    # pydantic-settings attempts to JSON-decode any List[...]-typed field
    # read from a .env file, which breaks on plain comma-separated values
    # like "pdf,docx,txt". Exposing `.allowed_extensions` / `.cors_origins`
    # as computed properties below avoids that entirely.
    ALLOWED_EXTENSIONS: str = "pdf,docx,txt"
    UPLOAD_DIR: str = "./data/uploads"

    # ---------------- Rate Limiting ----------------
    RATE_LIMIT_PER_MINUTE: int = 60

    # ---------------- CORS ----------------
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @staticmethod
    def _split_csv(value: str) -> List[str]:
        return [item.strip() for item in value.split(",") if item.strip()]

    @property
    def allowed_extensions(self) -> List[str]:
        return self._split_csv(self.ALLOWED_EXTENSIONS)

    @property
    def cors_origins(self) -> List[str]:
        return self._split_csv(self.CORS_ORIGINS)

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor so the .env file is parsed only once."""
    return Settings()


settings = get_settings()
