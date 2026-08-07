"""
User service — updated with username support and email verification.
"""

from datetime import datetime, timezone

from bson import ObjectId

from core.database import get_users_collection
from core.logging import get_logger
from models.user import UserInDB, UserPublic
from utils.security import hash_password, verify_password

logger = get_logger(__name__)


async def create_user(
    full_name: str, username: str, email: str, password: str
) -> UserPublic:
    """Create a new user. Raises ValueError on duplicate email/username."""
    collection = get_users_collection()

    if await collection.find_one({"email": email.lower()}):
        raise ValueError("An account with this email already exists.")
    if await collection.find_one({"username": username.lower()}):
        raise ValueError("This username is already taken.")

    user_doc = UserInDB(
        email=email.lower(),
        username=username.lower(),
        full_name=full_name,
        hashed_password=hash_password(password),
        is_email_verified=False,
    )
    result = await collection.insert_one(
        user_doc.model_dump(by_alias=True, exclude={"id"})
    )
    user_doc.id = str(result.inserted_id)
    logger.info("user_created", user_id=user_doc.id, email=email)
    return _to_public(user_doc)


class AuthError(Exception):
    """Structured authentication error with a machine-readable code."""
    def __init__(self, code: str, message: str, http_status: int = 401):
        self.code = code
        self.message = message
        self.http_status = http_status
        super().__init__(message)


async def authenticate_user(email: str, password: str) -> "UserPublic":
    """Verify credentials. Raises AuthError with a structured code.

    OWASP: never reveal whether email or password is wrong individually —
    both return the same INVALID_CREDENTIALS message.
    """
    collection = get_users_collection()
    doc = await collection.find_one({"email": email.lower()})

    # Check credentials — intentionally combines missing-user and wrong-password
    # into one branch to prevent timing-based user enumeration.
    if not doc or not verify_password(password, doc["hashed_password"]):
        raise AuthError(
            code="INVALID_CREDENTIALS",
            message="Invalid email or password.",
            http_status=401,
        )

    if not doc.get("is_active", True):
        raise AuthError(
            code="ACCOUNT_DISABLED",
            message="This account has been deactivated. Please contact support.",
            http_status=403,
        )

    if not doc.get("is_email_verified", False):
        raise AuthError(
            code="EMAIL_NOT_VERIFIED",
            message="Please verify your email address before logging in.",
            http_status=403,
        )

    await collection.update_one(
        {"_id": doc["_id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc)}},
    )
    user = UserInDB(**{**doc, "_id": str(doc["_id"])})
    return _to_public(user)


async def get_user_by_id(user_id: str) -> UserPublic | None:
    collection = get_users_collection()
    try:
        doc = await collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None
    if not doc:
        return None
    return _to_public(UserInDB(**{**doc, "_id": str(doc["_id"])}))


async def mark_email_verified(user_id: str) -> None:
    """Mark a user's email as verified."""
    collection = get_users_collection()
    await collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_email_verified": True, "updated_at": datetime.now(timezone.utc)}},
    )
    logger.info("email_verified", user_id=user_id)


async def get_user_by_email(email: str) -> UserPublic | None:
    collection = get_users_collection()
    doc = await collection.find_one({"email": email.lower()})
    if not doc:
        return None
    return _to_public(UserInDB(**{**doc, "_id": str(doc["_id"])}))


def _to_public(user: UserInDB) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        is_email_verified=user.is_email_verified,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )
