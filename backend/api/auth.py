"""
Auth API — Registration, Login, Email Verification, and JWT token management.

Routes:
  POST /auth/register          — create account + send verification email
  POST /auth/login             — authenticate and issue JWT
  POST /auth/verify-email      — verify token from email link
  POST /auth/resend-verification — resend verification email
  GET  /auth/me                — get current user profile

All error responses include a machine-readable `code` field for the frontend
to map to specific UI states (INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED, etc.)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from config.settings import get_settings
from core.dependencies import get_current_user
from core.logging import get_logger
from models.user import UserPublic
from schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    VerifyEmailRequest,
)
from services.email_service import (
    create_verification_token,
    send_verification_email,
    verify_token,
)
from services.user_service import (
    AuthError,
    authenticate_user,
    create_user,
    get_user_by_email,
    mark_email_verified,
)
from utils.security import create_access_token

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


def _auth_error(code: str, message: str, http_status: int) -> JSONResponse:
    """Return a structured JSON error with a machine-readable code."""
    return JSONResponse(
        status_code=http_status,
        content={"code": code, "message": message},
    )


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new account",
)
async def register(payload: RegisterRequest) -> RegisterResponse:
    """Register a new user, then send a verification email."""
    try:
        user = await create_user(
            full_name=payload.full_name,
            username=payload.username,
            email=payload.email,
            password=payload.password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    token = await create_verification_token(user.id, user.email)
    await send_verification_email(user.email, user.full_name, token)

    logger.info("user_registered", user_id=user.id)
    return RegisterResponse(
        message="Account created! Please check your email to verify your address.",
        user_id=user.id,
        email_sent_to=user.email,
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Authenticate and receive a JWT token",
)
async def login(payload: LoginRequest):
    """Authenticate with email + password. Email must be verified first.

    Returns structured error codes so the frontend can render appropriate UI:
    - INVALID_CREDENTIALS (401) — wrong email or password
    - EMAIL_NOT_VERIFIED (403) — correct credentials but email unverified
    - ACCOUNT_DISABLED (403) — account deactivated
    """
    try:
        user = await authenticate_user(payload.email, payload.password)
    except AuthError as exc:
        return _auth_error(exc.code, exc.message, exc.http_status)

    access_token, expires_in = create_access_token(user.id)
    logger.info("user_logged_in", user_id=user.id)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=user,
    )


@router.post(
    "/verify-email",
    summary="Verify email address using the token from the verification email",
)
async def verify_email(payload: VerifyEmailRequest):
    """Verify a user's email address.

    Returns structured codes so the frontend can render the right state:
    - success: email verified, user can log in
    - TOKEN_EXPIRED: link has expired, resend required
    - TOKEN_ALREADY_USED: already verified, just go to login
    - INVALID_TOKEN: malformed / never existed
    """
    result = await verify_token(payload.token)

    if not result["ok"]:
        code = result["code"]
        if code == "TOKEN_EXPIRED":
            return _auth_error(
                code="TOKEN_EXPIRED",
                message="This verification link has expired. Please request a new one.",
                http_status=410,
            )
        if code == "TOKEN_ALREADY_USED":
            # Already verified — treat as success variant
            return JSONResponse(
                status_code=200,
                content={"code": "TOKEN_ALREADY_USED", "message": "Your email is already verified. You can log in."},
            )
        # INVALID_TOKEN
        return _auth_error(
            code="INVALID_TOKEN",
            message="This verification link is invalid.",
            http_status=400,
        )

    # Check if user is already verified (token was consumed on a previous request)
    user = await get_user_by_email_internal(result["user_id"])
    if user and user.is_email_verified:
        # Verified by a different request (race), treat as already done
        return JSONResponse(
            status_code=200,
            content={"code": "TOKEN_ALREADY_USED", "message": "Your email is already verified. You can log in."},
        )

    await mark_email_verified(result["user_id"])
    logger.info("email_verified_via_api", user_id=result["user_id"])

    return JSONResponse(
        status_code=200,
        content={
            "code": "SUCCESS",
            "message": "Email verified successfully! You can now log in.",
            "user_id": result["user_id"],
        },
    )


@router.post(
    "/resend-verification",
    summary="Resend the verification email",
)
async def resend_verification(payload: ResendVerificationRequest):
    """Resend a verification email. Always returns 200 to prevent user enumeration."""
    user = await get_user_by_email(payload.email)

    if not user:
        # Security: don't leak whether email exists
        return {"message": "If this email is registered, a verification link has been sent."}

    if user.is_email_verified:
        return {"message": "This email is already verified. You can log in."}

    token = await create_verification_token(user.id, user.email)
    await send_verification_email(user.email, user.full_name, token)

    return {"message": "Verification email sent. Please check your inbox."}


@router.get(
    "/me",
    response_model=UserPublic,
    summary="Get current authenticated user profile",
)
async def get_me(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
    return current_user


# ── Internal helpers ──────────────────────────────────────────────────────────

async def get_user_by_email_internal(user_id: str):
    """Fetch user by ID to check is_email_verified without leaking info."""
    from services.user_service import get_user_by_id
    return await get_user_by_id(user_id)
