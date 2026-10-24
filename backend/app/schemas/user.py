"""
Pydantic schemas for User-related responses.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    """Public representation of a user."""

    id: int
    email: EmailStr
    full_name: str
    role: str
    company_id: int | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    """Minimal user info (used inside company responses, etc.)."""

    id: int
    email: str
    full_name: str
    role: str

    model_config = {"from_attributes": True}
