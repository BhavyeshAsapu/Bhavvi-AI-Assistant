"""
CORS middleware configuration.

Reads allowed origins from settings so that the same code works for
local development (localhost) and production (Vercel domain) without
modification.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import get_settings


def add_cors_middleware(app: FastAPI) -> None:
    """Register CORSMiddleware on the FastAPI application."""
    settings = get_settings()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,          # list[str], NOT the raw comma-joined string
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    )
