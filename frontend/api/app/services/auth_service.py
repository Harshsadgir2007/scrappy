"""
Authentication service — business logic for register, login, and token refresh.
"""

import json

from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def _build_token_pair(user: User) -> TokenResponse:
    """Create access + refresh tokens for a given user."""
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "company_id": user.company_id,
    }
    return TokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
    )


def register_user(payload: RegisterRequest, db: Session) -> TokenResponse:
    """Register a new user along with their company.

    1. Checks email uniqueness.
    2. Creates the Company record with statutory registration details.
    3. Creates the User linked to the company.
    4. Returns a JWT token pair.
    """
    # Check email uniqueness
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise ValueError("Email already registered")

    # Create company
    company = Company(
        name=payload.company_name,
        industry=payload.industry,
        company_reg_num=payload.company_reg_num,
        company_license=payload.company_license,
        gstin=payload.gstin,
        mca_record=payload.mca_record,
        declared_products=json.dumps(payload.declared_products),
        capacity_tons_per_year=payload.capacity_tons_per_year,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        phone=payload.phone,
    )
    db.add(company)
    db.flush()  # Get company.id without committing

    # Create user
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        company_id=company.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _build_token_pair(user)


def login_user(payload: LoginRequest, db: Session) -> TokenResponse:
    """Authenticate a user with email and password."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise ValueError("Invalid email or password")

    if not user.is_active:
        raise ValueError("Account is deactivated")

    return _build_token_pair(user)


def refresh_access_token(refresh_token_str: str, db: Session) -> TokenResponse:
    """Verify refresh token and issue a fresh access + refresh token pair."""
    token_data = decode_token(refresh_token_str)
    if not token_data or token_data.get("type") != "refresh":
        raise ValueError("Invalid or expired refresh token")

    user_id = token_data.get("sub")
    if not user_id:
        raise ValueError("Invalid token payload")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise ValueError("User not found or inactive")

    return _build_token_pair(user)
