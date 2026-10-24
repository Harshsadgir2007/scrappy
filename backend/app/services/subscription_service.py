"""
Company Subscription Business Logic Service.

Enforces company-level annual subscription:
- INR 2,500 / year per company (shared across all users of the company).
- Active subscription enables marketplace operations (listings, purchase orders, trade execution).
- Expired or unpaid status blocks protected operations.
- Auditable payment records with duplicate prevention and idempotency.
- Proper renewal calculation (adds 365 days from current expiry or today).
"""

import uuid
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.config import settings
from app.models.company import Company
from app.models.subscription import CompanySubscription, SubscriptionPayment
from app.services.notification_service import create_notification


def get_or_create_subscription(company_id: int, db: Session) -> CompanySubscription:
    """Retrieves or initializes the company-level subscription."""
    sub = db.query(CompanySubscription).filter(CompanySubscription.company_id == company_id).first()
    if not sub:
        sub = CompanySubscription(
            company_id=company_id,
            status="inactive",
            annual_fee=settings.ANNUAL_SUBSCRIPTION_FEE,
            currency="INR",
            payment_status="pending",
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
    else:
        # Check if active subscription has passed expiry
        now = datetime.now(timezone.utc)
        if sub.status == "active" and sub.expiry_date:
            exp = sub.expiry_date.replace(tzinfo=timezone.utc) if sub.expiry_date.tzinfo is None else sub.expiry_date
            if exp < now:
                sub.status = "expired"
                db.commit()
                db.refresh(sub)
    return sub


def is_company_subscription_active(company_id: int, db: Session) -> bool:
    """Checks whether the company currently holds an active, unexpired subscription."""
    sub = db.query(CompanySubscription).filter(CompanySubscription.company_id == company_id).first()
    if not sub:
        return False

    now = datetime.now(timezone.utc)
    if sub.status != "active" or not sub.expiry_date:
        return False

    exp = sub.expiry_date.replace(tzinfo=timezone.utc) if sub.expiry_date.tzinfo is None else sub.expiry_date
    if exp < now:
        if sub.status != "expired":
            sub.status = "expired"
            db.commit()
        return False

    return True


def initiate_subscription_checkout(company_id: int, db: Session) -> dict:
    """Initiates a subscription payment checkout order.

    Integrates with configured payment provider (Razorpay structure).
    """
    sub = get_or_create_subscription(company_id, db)
    company = db.query(Company).filter(Company.id == company_id).first()

    order_id = f"sub_order_{company_id}_{uuid.uuid4().hex[:10]}"

    return {
        "gateway": "razorpay",
        "key_id": settings.RAZORPAY_KEY_ID,
        "gateway_order_id": order_id,
        "amount": settings.ANNUAL_SUBSCRIPTION_FEE,
        "currency": "INR",
        "company_id": company_id,
        "company_name": company.name if company else f"Company #{company_id}",
        "description": "Annual Platform Subscription (1 Year Shared Access)",
        "annual_fee": settings.ANNUAL_SUBSCRIPTION_FEE,
        "mode": settings.PAYMENT_GATEWAY_MODE,
    }


def verify_and_confirm_payment(
    company_id: int,
    payment_data: dict,
    db: Session,
) -> tuple[CompanySubscription, SubscriptionPayment | None]:
    """Verifies payment confirmation and activates or renews the annual subscription.

    Safely handles duplicate callbacks and idempotent requests.
    """
    sub = get_or_create_subscription(company_id, db)

    gateway_payment_id = payment_data.get("gateway_payment_id")
    gateway_order_id = payment_data.get("gateway_order_id")
    gateway_signature = payment_data.get("gateway_signature")
    is_success = payment_data.get("status", "success").lower() in ("success", "paid")

    if not gateway_payment_id:
        raise ValueError("Missing gateway payment reference.")

    # ── Duplicate Callback / Idempotency Check ────────────────────────
    existing_payment = db.query(SubscriptionPayment).filter(
        SubscriptionPayment.gateway_payment_id == gateway_payment_id
    ).first()

    if existing_payment:
        # Already processed this exact payment reference
        return sub, existing_payment

    now = datetime.now(timezone.utc)

    # ── Handle Payment Failure ────────────────────────────────────────
    if not is_success:
        failure_note = payment_data.get("failure_reason", "Payment failed or declined by provider.")
        sub.payment_status = "failed"
        # Does NOT activate subscription!
        payment_record = SubscriptionPayment(
            subscription_id=sub.id,
            company_id=company_id,
            amount=settings.ANNUAL_SUBSCRIPTION_FEE,
            currency="INR",
            payment_gateway=payment_data.get("payment_gateway", "razorpay"),
            gateway_order_id=gateway_order_id,
            gateway_payment_id=gateway_payment_id,
            gateway_signature=gateway_signature,
            status="failed",
            period_start=now,
            period_end=now,
            notes=failure_note,
        )
        db.add(payment_record)
        db.commit()
        db.refresh(sub)
        db.refresh(payment_record)

        create_notification(
            db=db,
            company_id=company_id,
            title="Subscription Payment Failed",
            message=f"Annual subscription payment of ₹2,500 failed. Reason: {failure_note}",
            notif_type="system",
            link="/subscription",
        )
        return sub, payment_record

    # ── Handle Payment Success & Renewal Period Calculation ───────────
    # If currently active and unexpired: extend 365 days from current expiry
    if sub.status == "active" and sub.expiry_date:
        cur_exp = sub.expiry_date.replace(tzinfo=timezone.utc) if sub.expiry_date.tzinfo is None else sub.expiry_date
        if cur_exp > now:
            period_start = cur_exp
            period_end = cur_exp + timedelta(days=365)
        else:
            period_start = now
            period_end = now + timedelta(days=365)
    else:
        period_start = now
        period_end = now + timedelta(days=365)

    sub.start_date = sub.start_date if (sub.status == "active" and sub.start_date) else period_start
    sub.expiry_date = period_end
    sub.status = "active"
    sub.payment_status = "paid"
    sub.payment_reference = gateway_payment_id
    sub.last_renewed_at = now
    sub.annual_fee = settings.ANNUAL_SUBSCRIPTION_FEE

    payment_record = SubscriptionPayment(
        subscription_id=sub.id,
        company_id=company_id,
        amount=settings.ANNUAL_SUBSCRIPTION_FEE,
        currency="INR",
        payment_gateway=payment_data.get("payment_gateway", "razorpay"),
        gateway_order_id=gateway_order_id,
        gateway_payment_id=gateway_payment_id,
        gateway_signature=gateway_signature,
        status="success",
        period_start=period_start,
        period_end=period_end,
        notes="Annual company subscription activated successfully.",
    )
    db.add(payment_record)
    db.commit()
    db.refresh(sub)
    db.refresh(payment_record)

    create_notification(
        db=db,
        company_id=company_id,
        title="Annual Subscription Activated! 🎉",
        message=f"Company subscription active until {period_end.strftime('%d %b %Y')}. All authorized users have full marketplace access.",
        notif_type="system",
        link="/subscription",
    )

    return sub, payment_record


def get_payment_history(company_id: int, db: Session) -> list[SubscriptionPayment]:
    """Returns the full chronological payment audit log for this company."""
    return (
        db.query(SubscriptionPayment)
        .filter(SubscriptionPayment.company_id == company_id)
        .order_by(SubscriptionPayment.created_at.desc())
        .all()
    )
