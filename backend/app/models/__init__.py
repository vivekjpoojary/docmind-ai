"""
Import all ORM models here so SQLAlchemy's mapper registry knows about
every model class before relationships (like User.documents referencing
"Document" by name) are resolved.
"""

from app.models.user import User
from app.models.document import Document, DocumentChunk
from app.models.conversation import Conversation, Message

__all__ = ["User", "Document", "DocumentChunk", "Conversation", "Message"]
