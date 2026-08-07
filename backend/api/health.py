"""
Health check endpoint.

Provides a lightweight liveness probe and a richer readiness probe that
verifies connectivity to all critical downstream services (MongoDB, ChromaDB).
"""

import time

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from config.settings import get_settings
from core.database import get_database
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Health"])

_start_time = time.time()


@router.get(
    "/health",
    summary="Liveness probe",
    response_description="Returns 200 if the service is running.",
)
async def health_check() -> JSONResponse:
    """Lightweight liveness probe — always fast, no external calls."""
    settings = get_settings()
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "healthy",
            "app": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
            "uptime_seconds": round(time.time() - _start_time, 2),
        },
    )


@router.get(
    "/health/ready",
    summary="Readiness probe",
    response_description="Returns 200 if all dependencies are reachable.",
)
async def readiness_check() -> JSONResponse:
    """Readiness probe — verifies connectivity to MongoDB and ChromaDB."""
    checks: dict[str, str] = {}
    overall = "healthy"

    # MongoDB check
    try:
        db = get_database()
        await db.command("ping")
        checks["mongodb"] = "ok"
    except Exception as exc:
        logger.error("readiness_mongodb_fail", error=str(exc))
        checks["mongodb"] = f"error: {exc}"
        overall = "degraded"

    # ChromaDB check
    try:
        import chromadb
        from config.settings import get_settings as gs
        s = gs()
        client = chromadb.PersistentClient(path=s.chroma_persist_directory)
        client.heartbeat()
        checks["chromadb"] = "ok"
    except Exception as exc:
        logger.error("readiness_chromadb_fail", error=str(exc))
        checks["chromadb"] = f"error: {exc}"
        overall = "degraded"

    http_status = status.HTTP_200_OK if overall == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=http_status,
        content={"status": overall, "checks": checks},
    )
