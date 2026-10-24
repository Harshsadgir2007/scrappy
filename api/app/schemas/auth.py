"""
Pydantic schemas for authentication endpoints.
"""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Payload for user registration.

    Creates both a User and a Company in a single request.
    """

    # User fields
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=1)
    role: str = Field(default="company", description="Role is company by default")

    # Company fields
    company_name: str = Field(..., min_length=1)
    industry: str = Field(..., min_length=1)

    # Statutory & Legal Registration Fields
    company_reg_num: str | None = Field(default=None, description="Company Registration Number / CIN")
    company_license: str | None = Field(default=None, description="Industrial / Factory License Number")
    gstin: str | None = Field(default=None, description="15-character GSTIN Number")
    mca_record: str | None = Field(default=None, description="MCA Record / RoC Compliance Status")

    declared_products: list[str] = Field(default_factory=list)
    capacity_tons_per_year: float | None = None

    # Address
    address: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    pincode: str = Field(..., min_length=1)
    phone: str | None = None


class LoginRequest(BaseModel):
    """Payload for user login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token pair returned on successful login / registration."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Payload for refreshing an access token."""

    refresh_token: str
