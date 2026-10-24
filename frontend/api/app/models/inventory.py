"""
Inventory ORM model.

Represents an enterprise's physical or allocated inventory of raw recyclable
materials, production scrap, and industrial by-products.
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


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True, index=True)

    # Core material attributes
    material_name = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False)  # e.g. "steel scrap", "fly ash", "textile waste", "metal", etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Stock quantities (metric tons)
    quantity_tons = Column(Float, nullable=False, default=0.0)
    reserved_tons = Column(Float, nullable=False, default=0.0)

    # Cost breakdown per ton (INR)
    actual_cost_per_ton = Column(Float, nullable=False, default=0.0)
    is_processed = Column(Boolean, nullable=False, default=False)
    processing_details = Column(Text, nullable=True)
    processed_cost_per_ton = Column(Float, nullable=False, default=0.0)

    # Transport & storage location
    storage_location = Column(String(512), nullable=True)
    city = Column(String(128), nullable=False)
    state = Column(String(128), nullable=False)
    pincode = Column(String(10), nullable=True)

    # Estimated transport rate per ton-km and toll
    freight_rate_per_ton_km = Column(Float, nullable=False, default=3.5)
    estimated_tolls = Column(Float, nullable=False, default=0.0)

    # Status: "in_stock", "low_stock", "depleted", "reserved", "listed"
    status = Column(String(30), nullable=False, default="in_stock")
    notes = Column(Text, nullable=True)

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
