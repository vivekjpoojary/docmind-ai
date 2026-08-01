"""
Document service: business logic for uploading and processing documents.

Processing pipeline (run synchronously right after upload for simplicity —
see PROJECT_PROGRESS.md for the note on moving this to a background task
queue like Celery/RQ for large files in a future iteration):

    1. Extract text (page-aware where possible)
    2. Split into overlapping chunks
    3. Generate embeddings for each chunk
    4. Store vectors in the user's FAISS index
    5. Store chunk metadata (text, page number, vector_id) in SQLite
    6. Mark the document READY (or FAILED, with the error captured)
"""

import uuid

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.rag.chunking import chunk_pages
from app.rag.embeddings.provider import get_embedding_provider
from app.rag.loaders import UnsupportedFileTypeError, load_document
from app.rag.vector_store.faiss_store import get_user_vector_store
from app.repositories.document_repository import DocumentRepository
from app.utils.file_utils import generate_storage_path, validate_upload


class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.documents = DocumentRepository(db)

    async def upload(self, owner_id: str, file: UploadFile) -> Document:
        contents = await file.read()
        extension = validate_upload(file, len(contents))

        existing = await self.documents.get_by_filename_for_owner(owner_id, file.filename)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A document named '{file.filename}' already exists. "
                "Please rename the file or delete the existing one first.",
            )

        storage_path = generate_storage_path(owner_id, file.filename)
        storage_path.write_bytes(contents)

        document = await self.documents.create(
            owner_id=owner_id,
            filename=file.filename,
            file_type=extension,
            file_path=str(storage_path),
            file_size_bytes=len(contents),
        )
        logger.info(f"Document uploaded: {document.filename} (id={document.id}, owner={owner_id})")

        # Process immediately (synchronous for this project's scope).
        await self.process(document)
        return document

    async def process(self, document: Document) -> Document:
        document = await self.documents.update_status(document, DocumentStatus.PROCESSING)
        try:
            pages = load_document(document.file_path, document.file_type)
            if not pages:
                raise ValueError("No extractable text found in this document.")

            chunks = chunk_pages(pages)
            if not chunks:
                raise ValueError("Document produced no valid chunks after splitting.")

            embedder = get_embedding_provider()
            texts = [c.content for c in chunks]
            embeddings = embedder.embed_documents(texts)

            vector_ids = [str(uuid.uuid4()) for _ in chunks]
            store = get_user_vector_store(document.owner_id)
            store.add(vector_ids, embeddings)

            chunk_rows = [
                DocumentChunk(
                    document_id=document.id,
                    vector_id=vid,
                    chunk_index=c.chunk_index,
                    page_number=c.page_number,
                    content=c.content,
                )
                for c, vid in zip(chunks, vector_ids)
            ]
            await self.documents.add_chunks(chunk_rows)

            document = await self.documents.update_status(
                document,
                DocumentStatus.READY,
                page_count=len(pages),
                chunk_count=len(chunks),
            )
            logger.info(
                f"Document processed: {document.filename} "
                f"({len(pages)} pages, {len(chunks)} chunks)"
            )
        except UnsupportedFileTypeError as exc:
            document = await self.documents.update_status(
                document, DocumentStatus.FAILED, error_message=str(exc)
            )
        except Exception as exc:  # noqa: BLE001 — deliberately broad: any processing
            # failure should mark the document FAILED with a readable reason,
            # never crash the upload request itself.
            logger.exception(f"Document processing failed for {document.id}: {exc}")
            document = await self.documents.update_status(
                document, DocumentStatus.FAILED, error_message=str(exc)
            )
        return document

    async def list_for_owner(self, owner_id: str) -> list[Document]:
        return await self.documents.list_for_owner(owner_id)

    async def get_owned_or_404(self, document_id: str, owner_id: str, is_admin: bool = False) -> Document:
        document = await self.documents.get_by_id(document_id)
        if document is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        if document.owner_id != owner_id and not is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        return document

    async def delete(self, document: Document) -> None:
        import os

        vector_ids = await self.documents.get_vector_ids_for_document(document.id)
        store = get_user_vector_store(document.owner_id)
        store.delete(vector_ids)

        if os.path.exists(document.file_path):
            os.remove(document.file_path)

        await self.documents.delete(document)
        logger.info(f"Document deleted: {document.filename} (id={document.id})")


async def rebuild_missing_faiss_indices(db: AsyncSession) -> None:
    """
    Automatic recovery helper for ephemeral storage environments (Render):
    Checks if any processed document chunks exist in DB whose user FAISS index files
    are missing on disk. If missing, rebuilds the FAISS vector index from stored DB chunks.
    """
    from sqlalchemy import select
    result = await db.execute(select(DocumentChunk))
    chunks = result.scalars().all()
    if not chunks:
        return

    doc_result = await db.execute(select(Document))
    docs = {d.id: d for d in doc_result.scalars().all()}

    chunks_by_user: dict[str, list[DocumentChunk]] = {}
    for chunk in chunks:
        doc = docs.get(chunk.document_id)
        if doc and doc.status == DocumentStatus.READY:
            chunks_by_user.setdefault(doc.owner_id, []).append(chunk)

    for user_id, user_chunks in chunks_by_user.items():
        vstore = get_user_vector_store(user_id)
        if vstore.ntotal == 0 and len(user_chunks) > 0:
            logger.info(
                f"Rebuilding missing FAISS vector index on startup for user {user_id} "
                f"({len(user_chunks)} chunks)"
            )
            texts = [c.content for c in user_chunks]
            chunk_ids = [c.id for c in user_chunks]
            vstore.add_texts(texts=texts, chunk_ids=chunk_ids)
