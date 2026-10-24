"""
Pydantic schemas for Material and MaterialRequest endpoints.
"""

from datetime import datetime
import json

from pydantic import BaseModel, Field, field_validator


# ── Material (catalog) ──────────────────────────────────────────────────


class MaterialResponse(BaseModel):
    """Public representation of a catalog material."""

    id: int
    name: str
    category: str
    description: str | None = None
    hazard_class: str | None = None
    compatible_industries: list[str] = []

    model_config = {"from_attributes": True}

    @field_validator("compatible_industries", mode="before")
    @classmethod
    def parse_compatible_industries(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
            return v
        return []


class MaterialCreate(BaseModel):
    """Admin-only payload to add a new material to the catalog."""

    name: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    description: str | None = None
    hazard_class: str | None = None
    compatible_industries: list[str] = Field(default_factory=list)


class MaterialUpdate(BaseModel):
    """Admin-only payload to update a material.  All fields optional."""

    name: str | None = None
    category: str | None = None
    description: str | None = None
    hazard_class: str | None = None
    compatible_industries: list[str] | None = None


# ── MaterialRequest ─────────────────────────────────────────────────────


class MaterialRequestCreate(BaseModel):
    """Seller payload to request a new material type."""

    name: str = Field(..., min_length=1)
    category: str | None = None
    description: str | None = None


class MaterialRequestResponse(BaseModel):
    """Response schema for material requests."""

    id: int
    name: str
    category: str | None = None
    description: str | None = None
    status: str
    admin_notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MaterialRequestAction(BaseModel):
    """Admin action to approve or reject a material request."""

    status: str = Field(
        ...,
        pattern="^(approved|rejected)$",
        description="New status for the request",
    )
    admin_notes: str | None = None
