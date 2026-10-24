"""
Order ORM model.

Represents a purchase request placed by a company for variable tons of a listing.
Includes order tracking lifecycle (pending -> approved -> dispatched -> in_transit -> delivered).
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


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(64), unique=True, nullable=False, index=True)

    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False, index=True)
    buyer_company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    seller_company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)

    requested_tons = Column(Float, nullable=False)

    # Landed Cost Breakdown
    material_cost = Column(Float, nullable=False)
    processing_cost = Column(Float, nullable=False, default=0.0)
    distance_km = Column(Float, nullable=False, default=0.0)
    freight_rate_per_ton_km = Column(Float, nullable=False, default=3.5)
    freight_cost = Column(Float, nullable=False, default=0.0)
    toll_estimate = Column(Float, nullable=False, default=0.0)
    total_landed_cost = Column(Float, nullable=False)

    # Status: "pending", "approved", "dispatched", "in_transit", "delivered", "rejected", "countered", "cancelled", "completed"
    status = Column(String(30), nullable=False, default="pending", index=True)

    # Order Tracking & Logistics Metadata
    carrier_name = Column(String(128), nullable=True)
    vehicle_number = Column(String(64), nullable=True)
    driver_phone = Column(String(32), nullable=True)
    dispatch_date = Column(DateTime, nullable=True)
    estimated_delivery_date = Column(DateTime, nullable=True)
    delivered_date = Column(DateTime, nullable=True)
    current_location = Column(String(128), nullable=True)
    tracking_history = Column(Text, nullable=True)  # JSON-encoded array of milestone objects

    # Phase 4 Pre-Book flag (PRD F7)
    is_prebook = Column(Boolean, nullable=False, default=False)

    # Intelligence & Audit tracking (PRD F2.6)
    compatibility_override = Column(Boolean, nullable=False, default=False)
    override_reason = Column(Text, nullable=True)
    capacity_sanity_warning = Column(Text, nullable=True)

    counter_tons = Column(Float, nullable=True)
    seller_notes = Column(Text, nullable=True)
    buyer_notes = Column(Text, nullable=True)

    reservation_expires_at = Column(DateTime, nullable=True)

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
    listing = relationship("Listing", back_populates="orders", lazy="joined")
    buyer_company = relationship("Company", foreign_keys=[buyer_company_id], lazy="joined")
    seller_company = relationship("Company", foreign_keys=[seller_company_id], lazy="joined")
