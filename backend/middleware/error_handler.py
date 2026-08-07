"""
Global exception → structured JSON error handler middleware.

Maps common exception types to appropriate HTTP status codes and sanitises
error messages so that internal implementation details are never leaked to
clients in production.
"""

import traceback
import uuid

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from config.settings import get_settings
from core.logging import get_logger

logger = get_logger(__name__)


def _error_response(
    request_id: str,
    status_code: int,
    error_type: str,
    message: str,
    details: list | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "type": error_type,
                "message": message,
                "details": details or [],
                "request_id": request_id,
            },
        },
    )


def add_error_handler(app: FastAPI) -> None:
    """Register global exception handlers on the FastAPI application."""

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        request_id = str(uuid.uuid4())
        details = [
            {
                "field": ".".join(str(loc) for loc in err["loc"]),
                "message": err["msg"],
                "type": err["type"],
            }
            for err in exc.errors()
        ]
        logger.warning(
            "validation_error",
            request_id=request_id,
            path=str(request.url),
            errors=details,
        )
        return _error_response(
            request_id=request_id,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_type="ValidationError",
            message="Request validation failed.",
            details=details,
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(
        request: Request, exc: ValueError
    ) -> JSONResponse:
        request_id = str(uuid.uuid4())
        logger.warning(
            "value_error",
            request_id=request_id,
            path=str(request.url),
            error=str(exc),
        )
        return _error_response(
            request_id=request_id,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_type="BadRequest",
            message=str(exc),
        )

    @app.exception_handler(PermissionError)
    async def permission_error_handler(
        request: Request, exc: PermissionError
    ) -> JSONResponse:
        request_id = str(uuid.uuid4())
        logger.warning(
            "permission_error",
            request_id=request_id,
            path=str(request.url),
        )
        return _error_response(
            request_id=request_id,
            status_code=status.HTTP_403_FORBIDDEN,
            error_type="Forbidden",
            message="You do not have permission to perform this action.",
        )

    @app.exception_handler(FileNotFoundError)
    async def not_found_handler(
        request: Request, exc: FileNotFoundError
    ) -> JSONResponse:
        request_id = str(uuid.uuid4())
        return _error_response(
            request_id=request_id,
            status_code=status.HTTP_404_NOT_FOUND,
            error_type="NotFound",
            message=str(exc),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        request_id = str(uuid.uuid4())
        settings = get_settings()

        logger.error(
            "unhandled_exception",
            request_id=request_id,
            path=str(request.url),
            exception_type=type(exc).__name__,
            traceback=traceback.format_exc(),
        )

        # In development expose the traceback; in production sanitise it
        message = (
            f"{type(exc).__name__}: {exc}"
            if not settings.is_production
            else "An unexpected error occurred. Please try again later."
        )

        return _error_response(
            request_id=request_id,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_type="InternalServerError",
            message=message,
        )
