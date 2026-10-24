"""
Material & MaterialRequest ORM models.

Material — admin-curated catalog of waste / by-product types that can be
listed on the exchange.

MaterialRequest — seller-submitted request to add a new material type
that doesn't exist in the catalog yet.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)

from app.database import Base


class Material(Base):
    """Master catalog of tradeable waste / by-product materials."""

    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)

    # Category: metal, chemical, organic, plastic, construction, textile, other
    category = Column(String(64), nullable=False)

    description = Column(Text, nullable=True)

    # Hazard classification: non-hazardous, low, moderate, high
    hazard_class = Column(String(32), nullable=True)

    # JSON-encoded list of compatible industry types
    compatible_industries = Column(Text, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime,
        nullable=True,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<Material id={self.id} name={self.name!r} category={self.category}>"


class MaterialRequest(Base):
    """User-submitted request to add a new material to the catalog."""

    __tablename__ = "material_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # The user who requested this material
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String(255), nullable=False)
    category = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)

    # Status: pending, approved, rejected
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
    )

    admin_notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<MaterialRequest id={self.id} name={self.name!r} status={self.status}>"
