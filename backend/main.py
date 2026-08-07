"""
Bhavvi AI Assistant — FastAPI application entry point.

This module wires together all middleware, routers, and lifecycle hooks.
It is the single place where the FastAPI app object is created.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config.settings import get_settings
from core.database import close_mongodb_connection, connect_to_mongodb
from core.logging import configure_logging, get_logger
from middleware.cors import add_cors_middleware
from middleware.error_handler import add_error_handler
from middleware.rate_limit import limiter

# ── Bootstrap logging before anything else ───────────────────────────────────
configure_logging()
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager.

    Handles startup and shutdown of shared resources so they are never
    leaked between requests.
    """
    logger.info("application_starting", env=settings.environment)
    await connect_to_mongodb()
    logger.info("application_ready", version=settings.app_version)

    yield  # Application is running

    logger.info("application_shutting_down")
    await close_mongodb_connection()
    logger.info("application_stopped")


# ── FastAPI application factory ───────────────────────────────────────────────

def create_application() -> FastAPI:
    """Create and fully configure the FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Production-ready multi-agent multimodal AI assistant "
            "powered by Gemini 2.5, LangGraph, and ChromaDB."
        ),
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Middleware (order matters — applied last-to-first) ────────────────────
    add_cors_middleware(app)
    add_error_handler(app)

    # ── Rate limiting ─────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── API Routers ───────────────────────────────────────────────────────────
    from api.health import router as health_router

    # Import additional routers lazily to avoid circular imports at startup
    def _register_routers():
        from api.auth import router as auth_router
        from api.chat import router as chat_router
        from api.upload import router as upload_router
        from api.sessions import router as sessions_router
        from api.documents import router as documents_router

        app.include_router(auth_router, prefix=settings.api_prefix)
        app.include_router(chat_router, prefix=settings.api_prefix)
        app.include_router(upload_router, prefix=settings.api_prefix)
        app.include_router(sessions_router, prefix=settings.api_prefix)
        app.include_router(documents_router, prefix=settings.api_prefix)

    # Health routes registered without prefix so /health is always accessible
    app.include_router(health_router)
    _register_routers()

    # ── Static file serving for uploads (dev only) ────────────────────────────
    if not settings.is_production:
        app.mount(
            "/uploads",
            StaticFiles(directory=str(settings.upload_path)),
            name="uploads",
        )

    logger.info(
        "application_configured",
        routes=len(app.routes),
        environment=settings.environment,
    )
    return app


app = create_application()
