"""
Commission calculation and tracking service.

Handles platform transaction commissions on circular material exchanges.
Business Rules:
- Commission applies ONLY when agreed material value is strictly > INR 5,00,000.
- Transactions worth exactly INR 5,00,000 or less incur ZERO commission.
- Total commission rate: 0.5% of agreed material value.
- Split equally between Buyer (0.25%) and Seller (0.25%).
- Base excludes GST, freight, and pass-through logistics tolls.
- Financial arithmetic uses Decimal for precision without floating-point errors.
- Distinct states for 'calculated' vs 'collected'.
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.commission import TransactionCommission
from app.models.order import Order


THRESHOLD = Decimal("500000.00")
TOTAL_RATE = Decimal("0.005")    # 0.5%
HALF_RATE = Decimal("0.0025")    # 0.25%


def compute_commission_breakdown(material_value: float | Decimal) -> dict:
    """Decimal-safe calculation of commission breakdown.

    Returns dict with:
    - is_eligible: bool
    - material_value: float
    - total_commission: float
    - buyer_contribution: float
    - seller_contribution: float
    - commission_rate: float (0.005 or 0.0)
    - buyer_rate: float (0.0025 or 0.0)
    - seller_rate: float (0.0025 or 0.0)
    """
    val = Decimal(str(material_value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Strictly greater than 5,00,000
    if val <= THRESHOLD:
        return {
            "is_eligible": False,
            "material_value": float(val),
            "commission_rate": 0.0,
            "total_commission": 0.0,
            "buyer_rate": 0.0,
            "buyer_contribution": 0.0,
            "seller_rate": 0.0,
            "seller_contribution": 0.0,
        }

    total_comm = (val * TOTAL_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    buyer_comm = (val * HALF_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    seller_comm = total_comm - buyer_comm  # ensures exact penny balance

    return {
        "is_eligible": True,
        "material_value": float(val),
        "commission_rate": float(TOTAL_RATE),
        "total_commission": float(total_comm),
        "buyer_rate": float(HALF_RATE),
        "buyer_contribution": float(buyer_comm),
        "seller_rate": float(HALF_RATE),
        "seller_contribution": float(seller_comm),
    }


def record_or_update_order_commission(order: Order, db: Session) -> TransactionCommission | None:
    """Calculates and stores or updates commission record for an order.

    Idempotent: updates existing commission record if order material cost changes.
    """
    breakdown = compute_commission_breakdown(order.material_cost)

    existing = db.query(TransactionCommission).filter(TransactionCommission.order_id == order.id).first()

    if not breakdown["is_eligible"]:
        if existing:
            # If quantity counter reduced value below threshold, update existing to zero or remove
            existing.material_transaction_value = breakdown["material_value"]
            existing.total_commission = 0.0
            existing.buyer_contribution = 0.0
            existing.seller_contribution = 0.0
            existing.commission_rate = 0.0
            existing.status = "waived"
            db.commit()
            db.refresh(existing)
            return existing
        return None

    if existing:
        existing.material_transaction_value = breakdown["material_value"]
        existing.commission_rate = breakdown["commission_rate"]
        existing.total_commission = breakdown["total_commission"]
        existing.buyer_rate = breakdown["buyer_rate"]
        existing.buyer_contribution = breakdown["buyer_contribution"]
        existing.seller_rate = breakdown["seller_rate"]
        existing.seller_contribution = breakdown["seller_contribution"]
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    comm = TransactionCommission(
        order_id=order.id,
        material_transaction_value=breakdown["material_value"],
        commission_rate=breakdown["commission_rate"],
        total_commission=breakdown["total_commission"],
        buyer_rate=breakdown["buyer_rate"],
        buyer_contribution=breakdown["buyer_contribution"],
        seller_rate=breakdown["seller_rate"],
        seller_contribution=breakdown["seller_contribution"],
        status="calculated",
        buyer_collection_status="uncollected",
        seller_collection_status="uncollected",
    )
    db.add(comm)
    db.commit()
    db.refresh(comm)
    return comm
