"""Utilities for validating and safely storing uploaded files."""

import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


def get_extension(filename: str) -> str:
    return Path(filename).suffix.lstrip(".").lower()


def validate_upload(file: UploadFile, file_size_bytes: int) -> str:
    """
    Validate an uploaded file's extension and size.
    Returns the validated (lowercase) extension, or raises HTTPException.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")

    extension = get_extension(file.filename)
    if extension not in settings.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type '.{extension}'. "
                f"Allowed types: {', '.join(settings.allowed_extensions)}"
            ),
        )

    if file_size_bytes > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File exceeds the maximum allowed size of "
                f"{settings.MAX_UPLOAD_SIZE_MB} MB."
            ),
        )

    if file_size_bytes == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    return extension


def safe_filename(original_filename: str) -> str:
    """Sanitize a filename for safe storage on disk (prevents path traversal)."""
    name = Path(original_filename).name  # strips any directory components
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    return name


def generate_storage_path(owner_id: str, original_filename: str) -> Path:
    """
    Build a unique on-disk path for a stored upload:
    {UPLOAD_DIR}/{owner_id}/{uuid}_{sanitized_original_name}
    The UUID prefix guarantees no collisions even for duplicate filenames.
    """
    owner_dir = Path(settings.UPLOAD_DIR) / owner_id
    owner_dir.mkdir(parents=True, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{safe_filename(original_filename)}"
    return owner_dir / unique_name
