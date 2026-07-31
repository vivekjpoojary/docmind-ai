"""
Search service: semantic, keyword, and hybrid search across a user's documents.

- Semantic: embed the query, search the user's FAISS index, return top-K
  chunks by cosine similarity (no confidence threshold gate here — unlike
  /ask, search results are meant to be browsed by the user, not fed
  directly into an LLM, so we don't hide low-but-nonzero matches).
- Keyword: case-insensitive substring match on chunk content via SQL.
- Hybrid: run both, merge, and rank — a chunk found by both methods is
  boosted above one found by only one.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentChunk
from app.rag.embeddings.provider import get_embedding_provider
from app.rag.vector_store.faiss_store import get_user_vector_store
from app.repositories.document_repository import DocumentRepository
from app.schemas.search import SearchMode, SearchRequest, SearchResponse, SearchResultItem


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.documents = DocumentRepository(db)

    async def _allowed_document_ids(self, owner_id: str, request: SearchRequest) -> set[str] | None:
        """
        Resolve the effective set of document IDs to search within, applying
        both the explicit document_ids filter and the upload-date filter.
        Returns None if there is no filtering at all (search everything).
        """
        if not request.document_ids and not request.uploaded_after and not request.uploaded_before:
            return None

        owned_docs = await self.documents.list_for_owner(owner_id)
        allowed = set()
        for doc in owned_docs:
            if request.document_ids and doc.id not in request.document_ids:
                continue
            if request.uploaded_after and doc.uploaded_at < request.uploaded_after:
                continue
            if request.uploaded_before and doc.uploaded_at > request.uploaded_before:
                continue
            allowed.add(doc.id)
        return allowed

    async def _semantic_results(
        self, owner_id: str, query: str, top_k: int, allowed_ids: set[str] | None
    ) -> dict[str, tuple[DocumentChunk, float]]:
        embedder = get_embedding_provider()
        query_vector = embedder.embed_query(query)
        store = get_user_vector_store(owner_id)
        raw_results = store.search(query_vector, top_k=top_k * 2)  # over-fetch, filter after

        vector_ids = [vid for vid, _ in raw_results]
        chunks = await self.documents.get_chunks_by_vector_ids(vector_ids)
        score_by_vid = dict(raw_results)

        results: dict[str, tuple[DocumentChunk, float]] = {}
        for chunk in chunks:
            if allowed_ids is not None and chunk.document_id not in allowed_ids:
                continue
            results[chunk.id] = (chunk, score_by_vid.get(chunk.vector_id, 0.0))
        return results

    async def _keyword_results(
        self, owner_id: str, query: str, top_k: int, allowed_ids: set[str] | None
    ) -> dict[str, tuple[DocumentChunk, float]]:
        chunks = await self.documents.keyword_search_chunks(
            owner_id,
            query,
            document_ids=list(allowed_ids) if allowed_ids is not None else None,
            limit=top_k * 2,
        )
        # Fixed relevance score for keyword hits; hybrid mode boosts chunks
        # found by both methods above either individually.
        return {chunk.id: (chunk, 0.5) for chunk in chunks}

    async def search(self, owner_id: str, request: SearchRequest) -> SearchResponse:
        allowed_ids = await self._allowed_document_ids(owner_id, request)

        semantic: dict[str, tuple[DocumentChunk, float]] = {}
        keyword: dict[str, tuple[DocumentChunk, float]] = {}

        if request.mode in (SearchMode.SEMANTIC, SearchMode.HYBRID):
            semantic = await self._semantic_results(owner_id, request.query, request.top_k, allowed_ids)
        if request.mode in (SearchMode.KEYWORD, SearchMode.HYBRID):
            keyword = await self._keyword_results(owner_id, request.query, request.top_k, allowed_ids)

        merged: dict[str, dict] = {}
        for chunk_id, (chunk, score) in semantic.items():
            merged[chunk_id] = {"chunk": chunk, "score": score, "match_type": "semantic"}
        for chunk_id, (chunk, score) in keyword.items():
            if chunk_id in merged:
                merged[chunk_id]["score"] = max(merged[chunk_id]["score"], score) + 0.25
                merged[chunk_id]["match_type"] = "both"
            else:
                merged[chunk_id] = {"chunk": chunk, "score": score, "match_type": "keyword"}

        ranked = sorted(merged.values(), key=lambda item: item["score"], reverse=True)[: request.top_k]

        doc_cache: dict[str, Document] = {}
        items: list[SearchResultItem] = []
        for entry in ranked:
            chunk: DocumentChunk = entry["chunk"]
            if chunk.document_id not in doc_cache:
                doc = await self.documents.get_by_id(chunk.document_id)
                if doc is not None:
                    doc_cache[chunk.document_id] = doc
            doc = doc_cache.get(chunk.document_id)
            if doc is None:
                continue
            items.append(
                SearchResultItem(
                    document_id=doc.id,
                    filename=doc.filename,
                    page_number=chunk.page_number,
                    excerpt=chunk.content[:300],
                    score=round(entry["score"], 4),
                    match_type=entry["match_type"],
                )
            )

        return SearchResponse(query=request.query, mode=request.mode, results=items)
