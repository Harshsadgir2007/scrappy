"""
Company Subscription and Payment ORM models.

Maintains an annual subscription for each industrial company (INR 2,500/year).
All authorized users of a company share the same company subscription status.
Also records an auditable payment history for renewals and accounting.
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


class CompanySubscription(Base):
    __tablename__ = "company_subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Status: 'active', 'expired', 'pending_payment', 'inactive'
    status = Column(String(30), nullable=False, default="inactive")
    annual_fee = Column(Float, nullable=False, default=2500.0)
    currency = Column(String(10), nullable=False, default="INR")

    start_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)

    # Payment info
    payment_status = Column(String(30), nullable=False, default="pending")  # 'paid', 'failed', 'pending'
    payment_reference = Column(String(128), nullable=True)
    last_renewed_at = Column(DateTime, nullable=True)

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
    company = relationship("Company", back_populates="subscription", lazy="joined")
    payments = relationship("SubscriptionPayment", back_populates="subscription", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<CompanySubscription id={self.id} company_id={self.company_id} status={self.status} expires={self.expiry_date}>"


class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subscription_id = Column(Integer, ForeignKey("company_subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)

    amount = Column(Float, nullable=False, default=2500.0)
    currency = Column(String(10), nullable=False, default="INR")

    payment_gateway = Column(String(64), nullable=False, default="razorpay")
    gateway_order_id = Column(String(128), nullable=True, index=True)
    gateway_payment_id = Column(String(128), nullable=True, unique=True, index=True)
    gateway_signature = Column(String(256), nullable=True)

    # Status: 'initiated', 'success', 'failed'
    status = Column(String(30), nullable=False, default="pending")
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    subscription = relationship("CompanySubscription", back_populates="payments")
    company = relationship("Company", lazy="joined")

    def __repr__(self) -> str:
        return f"<SubscriptionPayment id={self.id} company_id={self.company_id} amount={self.amount} status={self.status}>"
