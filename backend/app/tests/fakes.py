"""
Fake embedding + LLM providers for testing the document/RAG pipeline
without downloading real ML models or requiring a running Ollama server.

The fake embedder is deterministic and keyword-sensitive (bag-of-words
style), so retrieval still behaves sensibly in tests: a question sharing
vocabulary with a chunk will score higher than an unrelated one.
"""

import hashlib

import numpy as np

VECTOR_DIM = 32


class FakeEmbeddingProvider:
    dimension = VECTOR_DIM

    def _embed_one(self, text: str) -> list[float]:
        vec = np.zeros(VECTOR_DIM, dtype="float32")
        for word in text.lower().split():
            h = int(hashlib.md5(word.encode()).hexdigest(), 16)
            vec[h % VECTOR_DIM] += 1.0
        return vec.tolist()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed_one(text)


class FakeLLM:
    """Echoes back a canned answer referencing the context, for deterministic assertions."""

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        return "Docker isolates applications using containers."
