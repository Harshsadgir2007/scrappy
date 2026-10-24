"""
Subscription router — Company-level annual subscription (INR 2,500/year).

Provides subscription status, checkout order generation, verified payment confirmation,
renewal handling, and complete payment history audit.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.company import Company
from app.models.subscription import CompanySubscription, SubscriptionPayment
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCheckoutResponse,
    SubscriptionPaymentResponse,
    SubscriptionPaymentVerifyRequest,
    SubscriptionStatusResponse,
)
from app.services import subscription_service

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/status", response_model=SubscriptionStatusResponse)
def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve current company subscription status, fee, and validity."""
    if not current_user.company_id:
        if current_user.role == "admin":
            return SubscriptionStatusResponse(
                company_id=0,
                company_name="Platform Administration",
                status="active",
                is_active=True,
                annual_fee=2500.0,
                currency="INR",
                start_date=datetime.now(timezone.utc),
                expiry_date=None,
                days_remaining=999,
                payment_status="paid",
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No company associated with account.")

    sub = subscription_service.get_or_create_subscription(current_user.company_id, db)
    is_active = subscription_service.is_company_subscription_active(current_user.company_id, db)

    days_rem = None
    if sub.expiry_date:
        now = datetime.now(timezone.utc)
        exp = sub.expiry_date.replace(tzinfo=timezone.utc) if sub.expiry_date.tzinfo is None else sub.expiry_date
        delta = (exp - now).days
        days_rem = max(0, delta)

    return SubscriptionStatusResponse(
        company_id=sub.company_id,
        company_name=current_user.company.name if current_user.company else f"Company #{sub.company_id}",
        status=sub.status,
        is_active=is_active,
        annual_fee=sub.annual_fee,
        currency=sub.currency,
        start_date=sub.start_date,
        expiry_date=sub.expiry_date,
        days_remaining=days_rem,
        payment_status=sub.payment_status,
        payment_reference=sub.payment_reference,
        last_renewed_at=sub.last_renewed_at,
    )


@router.post("/create-checkout-order", response_model=SubscriptionCheckoutResponse)
def create_checkout_order(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initiates annual subscription checkout order."""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No company associated with account.")

    data = subscription_service.initiate_subscription_checkout(current_user.company_id, db)
    return SubscriptionCheckoutResponse(**data)


@router.post("/verify-payment", response_model=SubscriptionStatusResponse)
def verify_payment(
    payload: SubscriptionPaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verifies payment confirmation and activates or renews the annual company subscription."""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No company associated with account.")

    try:
        sub, payment_rec = subscription_service.verify_and_confirm_payment(
            company_id=current_user.company_id,
            payment_data=payload.model_dump(),
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    is_active = subscription_service.is_company_subscription_active(current_user.company_id, db)
    days_rem = None
    if sub.expiry_date:
        now = datetime.now(timezone.utc)
        exp = sub.expiry_date.replace(tzinfo=timezone.utc) if sub.expiry_date.tzinfo is None else sub.expiry_date
        days_rem = max(0, (exp - now).days)

    return SubscriptionStatusResponse(
        company_id=sub.company_id,
        company_name=current_user.company.name if current_user.company else f"Company #{sub.company_id}",
        status=sub.status,
        is_active=is_active,
        annual_fee=sub.annual_fee,
        currency=sub.currency,
        start_date=sub.start_date,
        expiry_date=sub.expiry_date,
        days_remaining=days_rem,
        payment_status=sub.payment_status,
        payment_reference=sub.payment_reference,
        last_renewed_at=sub.last_renewed_at,
    )


@router.get("/history", response_model=list[SubscriptionPaymentResponse])
def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves full audit payment history for the caller's company."""
    if not current_user.company_id:
        return []
    payments = subscription_service.get_payment_history(current_user.company_id, db)
    return [
        SubscriptionPaymentResponse(
            id=p.id,
            company_id=p.company_id,
            amount=p.amount,
            currency=p.currency,
            payment_gateway=p.payment_gateway,
            gateway_order_id=p.gateway_order_id,
            gateway_payment_id=p.gateway_payment_id,
            status=p.status,
            period_start=p.period_start,
            period_end=p.period_end,
            notes=p.notes,
            created_at=p.created_at,
        )
        for p in payments
    ]
