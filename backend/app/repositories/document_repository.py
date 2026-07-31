"""Data access layer for Document and DocumentChunk entities."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentChunk, DocumentStatus


class DocumentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        owner_id: str,
        filename: str,
        file_type: str,
        file_path: str,
        file_size_bytes: int,
    ) -> Document:
        document = Document(
            owner_id=owner_id,
            filename=filename,
            file_type=file_type,
            file_path=file_path,
            file_size_bytes=file_size_bytes,
            status=DocumentStatus.UPLOADED,
        )
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def get_by_id(self, document_id: str) -> Document | None:
        result = await self.db.execute(select(Document).where(Document.id == document_id))
        return result.scalar_one_or_none()

    async def get_by_filename_for_owner(self, owner_id: str, filename: str) -> Document | None:
        result = await self.db.execute(
            select(Document).where(Document.owner_id == owner_id, Document.filename == filename)
        )
        return result.scalar_one_or_none()

    async def list_for_owner(self, owner_id: str) -> list[Document]:
        result = await self.db.execute(
            select(Document).where(Document.owner_id == owner_id).order_by(Document.uploaded_at.desc())
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[Document]:
        result = await self.db.execute(select(Document).order_by(Document.uploaded_at.desc()))
        return list(result.scalars().all())

    async def update_status(
        self,
        document: Document,
        status: DocumentStatus,
        error_message: str | None = None,
        page_count: int | None = None,
        chunk_count: int | None = None,
    ) -> Document:
        from datetime import datetime, timezone

        document.status = status
        document.error_message = error_message
        if page_count is not None:
            document.page_count = page_count
        if chunk_count is not None:
            document.chunk_count = chunk_count
        if status in (DocumentStatus.READY, DocumentStatus.FAILED):
            document.processed_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def delete(self, document: Document) -> None:
        await self.db.delete(document)
        await self.db.commit()

    async def add_chunks(self, chunks: list[DocumentChunk]) -> None:
        self.db.add_all(chunks)
        await self.db.commit()

    async def get_chunks_by_vector_ids(self, vector_ids: list[str]) -> list[DocumentChunk]:
        if not vector_ids:
            return []
        result = await self.db.execute(
            select(DocumentChunk).where(DocumentChunk.vector_id.in_(vector_ids))
        )
        return list(result.scalars().all())

    async def get_vector_ids_for_document(self, document_id: str) -> list[str]:
        result = await self.db.execute(
            select(DocumentChunk.vector_id).where(DocumentChunk.document_id == document_id)
        )
        return [row[0] for row in result.all()]

    async def keyword_search_chunks(
        self,
        owner_id: str,
        query: str,
        document_ids: list[str] | None = None,
        limit: int = 50,
    ) -> list[DocumentChunk]:
        """
        Simple case-insensitive substring search across this user's chunks.
        Joined against Document to enforce ownership (a user can only
        keyword-search their own documents).
        """
        stmt = (
            select(DocumentChunk)
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(Document.owner_id == owner_id)
            .where(DocumentChunk.content.ilike(f"%{query}%"))
        )
        if document_ids:
            stmt = stmt.where(DocumentChunk.document_id.in_(document_ids))
        stmt = stmt.limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_owner_storage_stats(self, owner_id: str) -> dict:
        """Aggregate page/chunk/storage totals for one user's documents."""
        result = await self.db.execute(
            select(
                func.count(Document.id),
                func.coalesce(func.sum(Document.page_count), 0),
                func.coalesce(func.sum(Document.chunk_count), 0),
                func.coalesce(func.sum(Document.file_size_bytes), 0),
            ).where(Document.owner_id == owner_id)
        )
        total_docs, total_pages, total_chunks, total_bytes = result.one()
        return {
            "total_documents": total_docs,
            "total_pages": total_pages,
            "total_chunks": total_chunks,
            "storage_bytes": total_bytes,
        }

    async def get_document_count_by_owner(self) -> dict[str, int]:
        """Map of owner_id -> document count, for admin user listings."""
        result = await self.db.execute(
            select(Document.owner_id, func.count(Document.id)).group_by(Document.owner_id)
        )
        return {owner_id: count for owner_id, count in result.all()}

    async def get_platform_stats(self) -> dict:
        """Aggregate totals across ALL users' documents, for admin analytics."""
        totals = await self.db.execute(
            select(
                func.count(Document.id),
                func.coalesce(func.sum(Document.file_size_bytes), 0),
            )
        )
        total_docs, total_bytes = totals.one()

        by_status = await self.db.execute(
            select(Document.status, func.count(Document.id)).group_by(Document.status)
        )
        status_counts = {status.value: count for status, count in by_status.all()}

        return {
            "total_documents": total_docs,
            "total_storage_bytes": total_bytes,
            "documents_by_status": status_counts,
        }
