"""
Security utilities: password hashing (bcrypt) and JWT access/refresh tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


# ------------------------------------------------------------------ #
# Password hashing (Direct bcrypt)
# ------------------------------------------------------------------ #
def hash_password(password: str) -> str:
    """Hash a plaintext password using direct bcrypt."""
    pw_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    pw_bytes = plain_password.encode("utf-8")
    hash_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(pw_bytes, hash_bytes)


# ------------------------------------------------------------------ #
# JWT tokens
# ------------------------------------------------------------------ #
def create_access_token(subject: str, extra_claims: Optional[dict[str, Any]] = None) -> str:
    """Create a short-lived JWT access token for `subject` (usually user id)."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {"sub": subject, "exp": expire, "type": "access"}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str) -> str:
    """Create a longer-lived JWT refresh token for `subject`."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": subject, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT. Raises jose.JWTError on invalid/expired tokens;
    callers (dependencies) are responsible for converting that into an HTTP 401.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


class TokenError(Exception):
    """Raised when a token is invalid, expired, or of the wrong type."""


def get_subject_from_token(token: str, expected_type: str = "access") -> str:
    try:
        payload = decode_token(token)
    except JWTError as exc:
        raise TokenError("Invalid or expired token") from exc

    if payload.get("type") != expected_type:
        raise TokenError(f"Expected a {expected_type} token")

    subject = payload.get("sub")
    if subject is None:
        raise TokenError("Token missing subject")
    return subject
