"""
Trade History ORM model.

Records immutable finalized circular economy transactions at both ends:
- Buyer enterprise ledger
- Seller enterprise ledger
Includes transaction commission tracking for permanent audit.
"""

from datetime import datetime, timezone
from sqlalchemy import (
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


class TradeHistory(Base):
    __tablename__ = "trade_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_number = Column(String(64), unique=True, nullable=False, index=True)

    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    buyer_company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    seller_company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)

    # Cached snapshot attributes for permanent audit
    material_name = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False)
    listing_title = Column(String(255), nullable=False)

    traded_tons = Column(Float, nullable=False)

    # Landed cost breakdown (INR)
    material_cost = Column(Float, nullable=False)
    processing_cost = Column(Float, nullable=False, default=0.0)
    distance_km = Column(Float, nullable=False, default=0.0)
    freight_cost = Column(Float, nullable=False, default=0.0)
    toll_cost = Column(Float, nullable=False, default=0.0)
    total_landed_cost = Column(Float, nullable=False)

    # Logistics metadata
    tracking_number = Column(String(64), nullable=True)
    carrier_name = Column(String(128), nullable=True)
    vehicle_number = Column(String(64), nullable=True)
    dispatch_date = Column(DateTime, nullable=True)
    delivery_date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Environmental circular economy metric (e.g. metric tons CO2 saved from landfill/virgin mining)
    carbon_offset_kg = Column(Float, nullable=False, default=0.0)

    # Status: "settled", "completed"
    status = Column(String(30), nullable=False, default="settled")
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    order = relationship("Order", lazy="joined")
    buyer_company = relationship("Company", foreign_keys=[buyer_company_id], lazy="joined")
    seller_company = relationship("Company", foreign_keys=[seller_company_id], lazy="joined")
    commission = relationship("TransactionCommission", back_populates="trade", uselist=False, lazy="joined")
