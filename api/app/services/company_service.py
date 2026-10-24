"""
Company service — business logic for company profile management and
admin verification workflows.
"""

import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyUpdate, VerificationAction


def get_user_company(user: User, db: Session) -> Company:
    """Return the company associated with the given user.

    Args:
        user: The authenticated User.
        db: Active database session.

    Returns:
        The Company ORM instance.

    Raises:
        ValueError: If the user has no company.
    """
    if user.company_id is None:
        raise ValueError("No company associated with your account")

    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise ValueError("Company not found")
    return company


def update_company(user: User, payload: CompanyUpdate, db: Session) -> Company:
    """Update a company's profile fields.

    If the company was previously verified it is reset to 'pending' so
    that an admin re-reviews the changes.

    Args:
        user: The authenticated user (must own the company).
        payload: Partial update data.
        db: Active database session.

    Returns:
        The updated Company.
    """
    company = get_user_company(user, db)

    update_data = payload.model_dump(exclude_unset=True)

    # Serialize declared_products list to JSON string
    if "declared_products" in update_data and update_data["declared_products"] is not None:
        update_data["declared_products"] = json.dumps(update_data["declared_products"])

    for field, value in update_data.items():
        setattr(company, field, value)

    # If the company was verified, flag for re-verification
    if company.verification_status == "verified":
        company.verification_status = "pending"
        company.verified_at = None

    db.commit()
    db.refresh(company)
    return company


def set_license_path(company: Company, path: str, db: Session) -> None:
    """Store the encrypted license file path and auto-verify company upon upload.

    Args:
        company: The Company to update.
        path: Path to the encrypted license file on disk.
        db: Active database session.
    """
    company.license_file_path = path
    company.verification_status = "verified"
    company.verified_at = datetime.now(timezone.utc)
    company.admin_notes = "Automatically verified upon license upload"
    db.commit()
    db.refresh(company)


# ── Admin operations ────────────────────────────────────────────────────


def list_companies(
    db: Session,
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Company]:
    """List companies with optional status filtering.

    Args:
        db: Active database session.
        status_filter: If provided, only return companies with this
            verification_status.
        skip: Pagination offset.
        limit: Maximum number of results.

    Returns:
        List of Company instances.
    """
    query = db.query(Company)
    if status_filter:
        query = query.filter(Company.verification_status == status_filter)
    return query.offset(skip).limit(limit).all()


def get_company_by_id(company_id: int, db: Session) -> Company:
    """Fetch a single company by ID.

    Args:
        company_id: Primary key.
        db: Active database session.

    Returns:
        The Company instance.

    Raises:
        ValueError: If not found.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise ValueError("Company not found")
    return company


def verify_company(
    company_id: int,
    action: VerificationAction,
    db: Session,
) -> Company:
    """Apply a verification decision to a company.

    Args:
        company_id: The company to act upon.
        action: The admin's verification decision.
        db: Active database session.

    Returns:
        The updated Company.

    Raises:
        ValueError: If the company is not found.
    """
    company = get_company_by_id(company_id, db)

    company.verification_status = action.status
    company.admin_notes = action.admin_notes

    if action.status == "verified":
        company.verified_at = datetime.now(timezone.utc)
    else:
        company.verified_at = None

    db.commit()
    db.refresh(company)
    return company
