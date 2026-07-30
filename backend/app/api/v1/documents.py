"""Document upload and management endpoints."""

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.document import DocumentRead, DocumentUploadResponse
from app.services.document_service import DocumentService

router = APIRouter(tags=["Documents"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a PDF, DOCX, or TXT file. The document is validated, stored, and
    immediately processed (text extraction -> chunking -> embeddings -> FAISS).
    """
    service = DocumentService(db)
    document = await service.upload(current_user.id, file)

    message = (
        "Document uploaded and processed successfully."
        if document.status.value == "ready"
        else f"Document uploaded but processing failed: {document.error_message}"
    )
    return DocumentUploadResponse(document=document, message=message)


@router.get("/documents", response_model=list[DocumentRead])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all documents uploaded by the current user."""
    service = DocumentService(db)
    return await service.list_for_owner(current_user.id)


@router.get("/document/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get metadata for a single document."""
    service = DocumentService(db)
    return await service.get_owned_or_404(document_id, current_user.id, current_user.is_admin)


@router.delete("/document/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document, its stored file, chunk metadata, and vectors."""
    service = DocumentService(db)
    document = await service.get_owned_or_404(document_id, current_user.id, current_user.is_admin)
    await service.delete(document)
    return None
