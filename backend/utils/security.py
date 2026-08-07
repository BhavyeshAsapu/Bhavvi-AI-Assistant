"""
Security utilities — password hashing and JWT token management.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from config.settings import get_settings
from core.logging import get_logger

logger = get_logger(__name__)


# ── Password utilities ────────────────────────────────────────────────────────

def hash_password(plaintext: str) -> str:
    """Return a bcrypt hash of the plaintext password."""
    return bcrypt.hashpw(plaintext.encode(), bcrypt.gensalt()).decode()


def verify_password(plaintext: str, hashed: str) -> bool:
    """Return True if plaintext matches the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plaintext.encode(), hashed.encode())
    except Exception:
        return False


# ── JWT utilities ─────────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> tuple[str, int]:
    """Create a signed JWT access token.

    Returns:
        Tuple of (token_string, expires_in_seconds).
    """
    settings = get_settings()
    expires_in = settings.jwt_access_token_expire_minutes * 60
    expire = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }

    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> str:
    """Decode and validate a JWT access token.

    Returns:
        user_id (the `sub` claim).

    Raises:
        ValueError: If the token is invalid or expired.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise ValueError("Token missing subject claim.")
        return user_id
    except JWTError as exc:
        raise ValueError(f"Invalid or expired token: {exc}") from exc
