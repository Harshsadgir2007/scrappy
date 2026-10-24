"""
Pydantic schemas for Company endpoints.
"""

from datetime import datetime
import json

from pydantic import BaseModel, Field, field_validator


class CompanyResponse(BaseModel):
    """Public company information."""

    id: int
    name: str
    industry: str

    # Statutory & Legal Registration Fields
    company_reg_num: str | None = None
    company_license: str | None = None
    gstin: str | None = None
    mca_record: str | None = None

    declared_products: list[str] = []
    capacity_tons_per_year: float | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    phone: str | None = None
    verification_status: str
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("declared_products", mode="before")
    @classmethod
    def parse_declared_products(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
            return [p.strip() for p in v.split(",") if p.strip()]
        if isinstance(v, list):
            return v
        return []


class CompanyUpdate(BaseModel):
    """Fields a company owner can update. All optional."""

    name: str | None = None
    industry: str | None = None

    # Statutory & Legal Registration Fields
    company_reg_num: str | None = None
    company_license: str | None = None
    gstin: str | None = None
    mca_record: str | None = None

    declared_products: list[str] | None = None
    capacity_tons_per_year: float | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    phone: str | None = None


class CompanyAdminResponse(BaseModel):
    """Full company detail visible to admins (includes sensitive fields)."""

    id: int
    name: str
    industry: str

    # Statutory & Legal Registration Fields
    company_reg_num: str | None = None
    company_license: str | None = None
    gstin: str | None = None
    mca_record: str | None = None

    declared_products: list[str] = []
    capacity_tons_per_year: float | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    license_file_path: str | None = None
    verification_status: str
    verified_at: datetime | None = None
    admin_notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

    @field_validator("declared_products", mode="before")
    @classmethod
    def parse_admin_declared_products(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
            return [p.strip() for p in v.split(",") if p.strip()]
        if isinstance(v, list):
            return v
        return []


class VerificationAction(BaseModel):
    """Admin action to verify, reject, or suspend a company."""

    action: str = Field(..., pattern="^(verify|reject|suspend)$")
    notes: str | None = None
