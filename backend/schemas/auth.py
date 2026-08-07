"""
Pydantic schemas for all Auth request/response bodies.
Includes strong password validation, username rules, and clean responses.
"""

import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from models.user import UserPublic


# ── Registration ───────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username may only contain letters, numbers, and underscores.")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors = []
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not re.search(r"[A-Z]", v):
            errors.append("one uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("one lowercase letter")
        if not re.search(r"\d", v):
            errors.append("one number")
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}.")
        return v


class RegisterResponse(BaseModel):
    message: str
    user_id: str
    email_sent_to: str


# ── Login ─────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400   # seconds until token expiry
    user: UserPublic


# ── Email Verification ────────────────────────────────────────────────────────
class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=20)


class ResendVerificationRequest(BaseModel):
    email: EmailStr
