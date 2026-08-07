"""
User domain model — with username and email verification fields.
"""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field
from pydantic.functional_validators import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    full_name: str = Field(..., min_length=2, max_length=100)


class UserInDB(UserBase):
    id: PyObjectId | None = Field(default=None, alias="_id")
    hashed_password: str
    is_active: bool = True
    is_email_verified: bool = False
    avatar_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: datetime | None = None

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class UserPublic(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    is_active: bool
    is_email_verified: bool
    avatar_url: str | None = None
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = {"populate_by_name": True}
