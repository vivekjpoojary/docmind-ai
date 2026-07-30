"""
RAG service: the question-answering pipeline.

Flow:
    1. Embed the user's question
    2. Search the user's FAISS index for the top-K most similar chunks
    3. Filter out chunks whose similarity is below CONFIDENCE_THRESHOLD
       (this is the main hallucination guard: if nothing is relevant
       enough, we tell the LLM there's no context at all)
    4. Build a strict, context-only prompt and call the LLM
    5. Map retrieved chunks back to their source documents for citations
    6. Compute an overall confidence score from retrieval similarity
    7. Persist the exchange to conversation history
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.models.document import Document
from app.rag.embeddings.provider import get_embedding_provider
from app.rag.llm_provider import get_llm_provider
from app.rag.prompts.qa_prompt import NOT_FOUND_MESSAGE, SYSTEM_PROMPT, build_user_prompt
from app.rag.vector_store.faiss_store import get_user_vector_store
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.document_repository import DocumentRepository
from app.schemas.ask import AskRequest, AskResponse, SourceCitation


class RAGService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.documents = DocumentRepository(db)
        self.conversations = ConversationRepository(db)

    async def ask(self, owner_id: str, request: AskRequest) -> AskResponse:
        top_k = request.top_k or settings.TOP_K_RESULTS

        # ---- 1. Retrieve ----
        embedder = get_embedding_provider()
        query_vector = embedder.embed_query(request.question)

        store = get_user_vector_store(owner_id)
        raw_results = store.search(query_vector, top_k=top_k)

        # ---- 2. Confidence gate (hallucination guard) ----
        relevant_results = [
            (vector_id, score) for vector_id, score in raw_results
            if score >= settings.CONFIDENCE_THRESHOLD
        ]

        vector_ids = [vid for vid, _ in relevant_results]
        chunk_rows = await self.documents.get_chunks_by_vector_ids(vector_ids)
        # Preserve retrieval order and attach scores
        score_by_vector_id = dict(relevant_results)
        chunk_rows.sort(key=lambda c: score_by_vector_id.get(c.vector_id, 0), reverse=True)

        # Optional: restrict to specific document_ids if the caller asked for it
        if request.document_ids:
            allowed = set(request.document_ids)
            chunk_rows = [c for c in chunk_rows if c.document_id in allowed]

        # ---- 3. Build citations (need document filenames) ----
        doc_cache: dict[str, Document] = {}
        sources: list[SourceCitation] = []
        context_blocks: list[str] = []

        for chunk in chunk_rows:
            if chunk.document_id not in doc_cache:
                doc = await self.documents.get_by_id(chunk.document_id)
                if doc is not None:
                    doc_cache[chunk.document_id] = doc
            doc = doc_cache.get(chunk.document_id)
            if doc is None:
                continue  # document was deleted between indexing and now

            score = score_by_vector_id.get(chunk.vector_id, 0.0)
            sources.append(
                SourceCitation(
                    document_id=doc.id,
                    filename=doc.filename,
                    page_number=chunk.page_number,
                    excerpt=chunk.content[:300],
                    relevance_score=round(score, 4),
                )
            )
            context_blocks.append(f"(From {doc.filename}, page {chunk.page_number}): {chunk.content}")

        found_relevant_context = len(context_blocks) > 0

        # ---- 4. Generate answer ----
        if found_relevant_context:
            llm = get_llm_provider()
            user_prompt = build_user_prompt(request.question, context_blocks)
            try:
                answer = llm.generate(SYSTEM_PROMPT, user_prompt)
            except RuntimeError as exc:
                logger.error(f"LLM generation failed: {exc}")
                answer = (
                    "The document search worked, but I couldn't reach the language "
                    f"model to generate an answer. Details: {exc}"
                )
                found_relevant_context = False
        else:
            answer = NOT_FOUND_MESSAGE

        # ---- 5. Confidence score ----
        # Average similarity of the chunks actually used, scaled to 0-100.
        if sources:
            avg_score = sum(s.relevance_score for s in sources) / len(sources)
            confidence = round(min(avg_score, 1.0) * 100, 1)
        else:
            confidence = 0.0

        # ---- 6. Persist to conversation history ----
        conversation_id = request.conversation_id
        if conversation_id:
            conversation = await self.conversations.get_by_id(conversation_id)
            if conversation is None or conversation.owner_id != owner_id:
                conversation = await self.conversations.create(
                    owner_id, title=request.question[:80]
                )
                conversation_id = conversation.id
        else:
            conversation = await self.conversations.create(owner_id, title=request.question[:80])
            conversation_id = conversation.id

        await self.conversations.add_message(conversation_id, role="user", content=request.question)
        await self.conversations.add_message(
            conversation_id,
            role="assistant",
            content=answer,
            sources=[s.model_dump() for s in sources],
            confidence=confidence,
        )

        return AskResponse(
            answer=answer,
            sources=sources,
            confidence=confidence,
            conversation_id=conversation_id,
            found_relevant_context=found_relevant_context,
        )
