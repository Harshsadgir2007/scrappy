"""
Transaction Commission ORM model.

Calculates and tracks a 0.5% platform commission on transactions with material value
strictly greater than INR 5,00,000, split 50/50 between buyer (0.25%) and seller (0.25%).
Commission is calculated exclusively on agreed material value (excluding GST & freight).
Maintains distinct states for 'calculated' vs 'collected'.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from app.database import Base


class TransactionCommission(Base):
    __tablename__ = "transaction_commissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    trade_id = Column(Integer, ForeignKey("trade_history.id", ondelete="SET NULL"), nullable=True, index=True)

    # Base material transaction value (strictly > INR 5,00,000 to be eligible)
    material_transaction_value = Column(Float, nullable=False)

    # Total commission (0.5% of material value)
    commission_rate = Column(Float, nullable=False, default=0.005)
    total_commission = Column(Float, nullable=False)

    # Split equally between buyer (0.25%) and seller (0.25%)
    buyer_rate = Column(Float, nullable=False, default=0.0025)
    buyer_contribution = Column(Float, nullable=False)

    seller_rate = Column(Float, nullable=False, default=0.0025)
    seller_contribution = Column(Float, nullable=False)

    # Overall Status: 'calculated', 'pending_collection', 'collected', 'waived'
    status = Column(String(30), nullable=False, default="calculated")

    # Distinct collection status for each party
    buyer_collection_status = Column(String(30), nullable=False, default="uncollected")
    seller_collection_status = Column(String(30), nullable=False, default="uncollected")

    buyer_payment_ref = Column(String(128), nullable=True)
    seller_payment_ref = Column(String(128), nullable=True)
    buyer_collected_at = Column(DateTime, nullable=True)
    seller_collected_at = Column(DateTime, nullable=True)

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
    order = relationship("Order", back_populates="commission", lazy="joined")
    trade = relationship("TradeHistory", back_populates="commission", lazy="joined")

    def __repr__(self) -> str:
        return f"<TransactionCommission id={self.id} order_id={self.order_id} total={self.total_commission} status={self.status}>"
