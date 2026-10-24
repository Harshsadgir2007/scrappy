"""
Pydantic schemas for Subscription & Payment endpoints.
"""

from datetime import datetime
from pydantic import BaseModel


class SubscriptionStatusResponse(BaseModel):
    company_id: int
    company_name: str
    status: str  # active, expired, pending_payment, inactive
    is_active: bool
    annual_fee: float
    currency: str
    start_date: datetime | None = None
    expiry_date: datetime | None = None
    days_remaining: int | None = None
    payment_status: str
    payment_reference: str | None = None
    last_renewed_at: datetime | None = None

    model_config = {"from_attributes": True}


class SubscriptionCheckoutResponse(BaseModel):
    gateway: str
    key_id: str
    gateway_order_id: str
    amount: float
    currency: str
    company_id: int
    company_name: str
    description: str
    annual_fee: float
    mode: str


class SubscriptionPaymentVerifyRequest(BaseModel):
    gateway_order_id: str | None = None
    gateway_payment_id: str
    gateway_signature: str | None = None
    status: str = "success"  # success or failed
    payment_gateway: str = "razorpay"
    failure_reason: str | None = None


class SubscriptionPaymentResponse(BaseModel):
    id: int
    company_id: int
    amount: float
    currency: str
    payment_gateway: str
    gateway_order_id: str | None = None
    gateway_payment_id: str | None = None
    status: str
    period_start: datetime
    period_end: datetime
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
