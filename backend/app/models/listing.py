"""
Listing ORM model.

Represents an offer by a verified company of recyclable waste, scrap,
or by-product. Identities remain anonymous to other companies.
Requires mandatory quality test certification before live marketplace publishing.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, autoincrement=True)

    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)

    # Category: "scrap", "by_product", "leftover", "steel scrap", "fly ash", "textile waste"
    category = Column(String(50), nullable=False, default="scrap")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Quantities in metric tons
    total_tons = Column(Float, nullable=False)
    remaining_tons = Column(Float, nullable=False)
    reserved_tons = Column(Float, nullable=False, default=0.0)

    # Pricing per ton (INR) - Actual Cost
    price_per_ton = Column(Float, nullable=False)
    min_price_floor = Column(Float, nullable=False)
    min_order_tons = Column(Float, nullable=False, default=1.0)

    # Processing details - Processed Cost
    is_processed = Column(Boolean, nullable=False, default=False)
    processing_details = Column(Text, nullable=True)
    processing_cost_per_ton = Column(Float, nullable=False, default=0.0)

    # Transport & Location - Transport Cost & Tolls
    pickup_address = Column(String(512), nullable=True)
    pickup_city = Column(String(128), nullable=False)
    pickup_state = Column(String(128), nullable=False)
    pickup_pincode = Column(String(10), nullable=True)
    pickup_latitude = Column(Float, nullable=True)
    pickup_longitude = Column(Float, nullable=True)
    freight_rate_per_ton_km = Column(Float, nullable=False, default=3.5)
    toll_estimate = Column(Float, nullable=False, default=0.0)

    # Status: "live", "paused", "closed", "coming_soon", "draft"
    status = Column(String(20), nullable=False, default="live")
    available_from = Column(DateTime, nullable=True)

    # Quality Certification Status: "approved", "pending_review", "rejected", "info_required", "draft"
    quality_status = Column(String(32), nullable=False, default="approved")

    # Phase 4 Coming Soon / Pre-Book extensions (PRD F7)
    is_coming_soon = Column(Boolean, nullable=False, default=False)
    expected_available_date = Column(DateTime, nullable=True)
    expected_tons = Column(Float, nullable=True)

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

    # Relationships
    company = relationship("Company", lazy="joined")
    material = relationship("Material", lazy="joined")
    orders = relationship("Order", back_populates="listing", lazy="selectin")
    quality_certificate = relationship("QualityTestCertificate", back_populates="listing", uselist=False, lazy="joined", cascade="all, delete-orphan")
