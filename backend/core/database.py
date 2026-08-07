"""
Async MongoDB client using Motor.

Provides a singleton database client and exposes typed collection accessors.
The connection is established lazily on first use and closed during application
shutdown via the lifespan context manager.
"""

import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config.settings import get_settings
from core.logging import get_logger

logger = get_logger(__name__)

_client: AsyncIOMotorClient | None = None


async def connect_to_mongodb() -> None:
    """Initialise the Motor client and verify connectivity.

    Uses certifi's CA bundle explicitly so TLS verification works on macOS,
    Linux, and containerised environments without relying on system certs.
    """
    global _client
    settings = get_settings()
    logger.info("connecting_to_mongodb", db=settings.mongodb_db_name)
    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        tlsCAFile=certifi.where(),      # explicit CA bundle — production safe
        serverSelectionTimeoutMS=30000, # 30 s timeout
    )
    # Verify the connection with a lightweight ping
    await _client.admin.command("ping")
    logger.info("mongodb_connected", db=settings.mongodb_db_name)


async def close_mongodb_connection() -> None:
    """Close the Motor client gracefully."""
    global _client
    if _client:
        _client.close()
        _client = None
        logger.info("mongodb_disconnected")


def get_database() -> AsyncIOMotorDatabase:
    """Return the application database.

    Raises:
        RuntimeError: If called before connect_to_mongodb().
    """
    if _client is None:
        raise RuntimeError(
            "MongoDB client is not initialised. "
            "Ensure connect_to_mongodb() was called during application startup."
        )
    settings = get_settings()
    return _client[settings.mongodb_db_name]


# ── Typed collection accessors ────────────────────────────────────────────────

def get_users_collection():
    return get_database()["users"]


def get_sessions_collection():
    return get_database()["sessions"]


def get_messages_collection():
    return get_database()["messages"]


def get_documents_collection():
    return get_database()["documents"]


def get_agent_logs_collection():
    return get_database()["agent_logs"]
