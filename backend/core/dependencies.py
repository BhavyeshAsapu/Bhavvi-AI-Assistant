"""
FastAPI dependency for authenticated route protection.

Route handlers declare `current_user: UserPublic = Depends(get_current_user)`
to require a valid JWT Bearer token. The dependency extracts the user from the
token and verifies the account is still active.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from models.user import UserPublic
from services.user_service import get_user_by_id
from utils.security import decode_access_token

_bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> UserPublic:
    """Extract and validate the current user from the Bearer token.

    Raises:
        HTTPException 401: If the token is missing, invalid, or expired.
        HTTPException 403: If the user account is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        user_id = decode_access_token(credentials.credentials)
    except ValueError:
        raise credentials_exception

    user = await get_user_by_id(user_id)
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    return user
