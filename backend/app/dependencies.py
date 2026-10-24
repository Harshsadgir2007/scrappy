"""
FastAPI dependencies for authentication, role enforcement, and
company verification checks.
"""

from typing import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.security import decode_token

# OAuth2 scheme — expects "Authorization: Bearer <token>" header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decode the JWT access token and return the corresponding User.

    Raises:
        HTTPException 401: If the token is invalid, expired, or the
            user does not exist / is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        sub_raw = payload.get("sub")
        token_type: str | None = payload.get("type")

        if sub_raw is None or token_type != "access":
            raise credentials_exception
        user_id = int(sub_raw)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception

    return user


def require_role(*roles: str) -> Callable:
    """Dependency factory that restricts access to users with specific roles.

    Usage::

        @router.get("/admin-only")
        def admin_endpoint(user: User = Depends(require_role("admin"))):
            ...

    Args:
        *roles: Allowed role strings (e.g. "admin", "seller").

    Returns:
        A FastAPI dependency that returns the current user if authorised.
    """

    def _role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}",
            )
        return current_user

    return _role_checker


def require_verified_company() -> Callable:
    """Dependency factory that ensures the user's company is verified.

    Returns:
        A FastAPI dependency that returns the current user if their
        company has ``verification_status == 'verified'``.
    """

    def _verified_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == "admin":
            # Admins bypass company verification checks
            return current_user

        if current_user.company is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No company associated with your account",
            )

        if current_user.company.verification_status != "verified":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your company must be verified to perform this action",
            )

        return current_user

    return _verified_checker
