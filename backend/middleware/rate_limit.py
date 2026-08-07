"""
Rate limiting middleware using slowapi (a Starlette/FastAPI port of Flask-Limiter).

Limits are applied per-client IP address. The limits are configured via
Settings so they can be tuned without code changes.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from config.settings import get_settings

settings = get_settings()

# Global limiter instance — imported by route handlers via `Depends`
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_requests_per_minute}/minute"],
    storage_uri="memory://",  # Use Redis URI in production for multi-process
)

# Dedicated stricter limit for chat endpoints
CHAT_RATE_LIMIT = f"{settings.rate_limit_chat_per_minute}/minute"
