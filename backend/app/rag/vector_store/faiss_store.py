"""
FAISS vector store wrapper.

Design decisions:
- One FAISS index PER USER, persisted under FAISS_INDEX_DIR/{user_id}/.
  This gives free multi-tenant isolation (a user's search can never surface
  another user's private documents) and keeps each index small and fast.
- Cosine similarity is used (vectors are L2-normalized, index is IndexFlatIP),
  so scores are directly usable as a confidence signal in [-1, 1] (in
  practice [0, 1] for normalized embeddings of natural language).
- FAISS internally only stores int64 IDs, so we maintain a small JSON
  sidecar mapping those to our string `vector_id`s (linked to DocumentChunk
  rows in SQLite, which hold the actual text + page number for citations).
- `IndexIDMap2` is used specifically because it supports `remove_ids`,
  which plain `IndexFlatIP` does not — this is what makes document
  deletion possible without rebuilding the whole index from scratch.
"""

import json
import threading
from pathlib import Path

import numpy as np

from app.core.config import settings
from app.core.logging import logger
from app.rag.embeddings.provider import get_embedding_provider

_write_lock = threading.Lock()  # FAISS indices are not thread-safe for writes


class UserVectorStore:
    """FAISS-backed vector store scoped to a single user."""

    def __init__(self, user_id: str):
        import faiss

        # FAISS uses OpenMP internally for parallel search. On some macOS
        # setups (especially Apple Silicon), FAISS's thread pool can crash
        # when it coexists with other background threads (e.g. SQLite's
        # async worker thread), causing a hard segfault rather than a
        # catchable Python exception. Forcing single-threaded search avoids
        # this entirely; for the index sizes here (thousands of chunks per
        # user, not millions), the performance cost is negligible.
        faiss.omp_set_num_threads(1)

        self.user_id = user_id
        self.dir_path = Path(settings.FAISS_INDEX_DIR) / user_id
        self.dir_path.mkdir(parents=True, exist_ok=True)

        self.index_path = self.dir_path / "index.faiss"
        self.map_path = self.dir_path / "id_map.json"

        self.dimension = get_embedding_provider().dimension

        if self.index_path.exists():
            self._index = faiss.read_index(str(self.index_path))
        else:
            base_index = faiss.IndexFlatIP(self.dimension)
            self._index = faiss.IndexIDMap2(base_index)

        if self.map_path.exists():
            with open(self.map_path, "r") as f:
                raw = json.load(f)
            # JSON keys are always strings; FAISS ids are ints
            self._id_to_vector_id: dict[int, str] = {int(k): v for k, v in raw.items()}
        else:
            self._id_to_vector_id = {}

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _normalize(vectors: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1e-12
        return vectors / norms

    def _next_faiss_id(self) -> int:
        return (max(self._id_to_vector_id.keys()) + 1) if self._id_to_vector_id else 0

    def _persist(self) -> None:
        import faiss

        faiss.write_index(self._index, str(self.index_path))
        with open(self.map_path, "w") as f:
            json.dump({str(k): v for k, v in self._id_to_vector_id.items()}, f)

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    def add(self, vector_ids: list[str], embeddings: list[list[float]]) -> None:
        """Add a batch of (vector_id, embedding) pairs to this user's index."""
        if not vector_ids:
            return
        with _write_lock:
            vectors = self._normalize(np.array(embeddings, dtype="float32"))
            faiss_ids = np.arange(
                self._next_faiss_id(), self._next_faiss_id() + len(vector_ids)
            ).astype("int64")

            self._index.add_with_ids(vectors, faiss_ids)
            for fid, vid in zip(faiss_ids.tolist(), vector_ids):
                self._id_to_vector_id[fid] = vid

            self._persist()
            logger.info(f"Added {len(vector_ids)} vectors to user {self.user_id}'s FAISS index")

    def search(self, query_embedding: list[float], top_k: int) -> list[tuple[str, float]]:
        """Return up to top_k (vector_id, similarity_score) pairs, best first."""
        if self._index.ntotal == 0:
            return []
        query = self._normalize(np.array([query_embedding], dtype="float32"))
        scores, faiss_ids = self._index.search(query, min(top_k, self._index.ntotal))

        results = []
        for score, fid in zip(scores[0].tolist(), faiss_ids[0].tolist()):
            if fid == -1:
                continue
            vector_id = self._id_to_vector_id.get(fid)
            if vector_id is not None:
                results.append((vector_id, score))
        return results

    def delete(self, vector_ids: list[str]) -> None:
        """Remove vectors by their string vector_id (e.g. when a document is deleted)."""
        if not vector_ids:
            return
        with _write_lock:
            to_remove = {vid for vid in vector_ids}
            faiss_ids_to_remove = [
                fid for fid, vid in self._id_to_vector_id.items() if vid in to_remove
            ]
            if not faiss_ids_to_remove:
                return

            id_array = np.array(faiss_ids_to_remove, dtype="int64")
            self._index.remove_ids(id_array)
            for fid in faiss_ids_to_remove:
                self._id_to_vector_id.pop(fid, None)

            self._persist()
            logger.info(f"Removed {len(faiss_ids_to_remove)} vectors from user {self.user_id}'s index")


def get_user_vector_store(user_id: str) -> UserVectorStore:
    """Factory — a fresh wrapper per call, loading the persisted index from disk."""
    return UserVectorStore(user_id)
