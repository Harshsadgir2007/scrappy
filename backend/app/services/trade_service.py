"""
Trade History Service.

Maintains an immutable ledger of finalized circular economy transactions
recorded at both the Buyer's end and the Seller's end.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.company import Company
from app.models.order import Order
from app.models.trade import TradeHistory
from app.schemas.trade import TradeHistoryResponse, TradeStatsResponse


def calculate_co2_offset(material_name: str, tons: float) -> float:
    """Estimated CO2 emissions saved in kg by using recycled/by-product material

    instead of virgin raw material.
    Steel: ~1,500 kg CO2 / ton
    Fly Ash in Cement: ~800 kg CO2 / ton
    Recycled Textile: ~2,000 kg CO2 / ton
    Default: ~1,000 kg CO2 / ton
    """
    mat_lower = material_name.lower()
    if "steel" in mat_lower or "metal" in mat_lower:
        factor = 1500.0
    elif "ash" in mat_lower:
        factor = 800.0
    elif "textile" in mat_lower or "yarn" in mat_lower or "cotton" in mat_lower:
        factor = 2000.0
    else:
        factor = 1000.0

    return round(factor * tons, 2)


def record_trade_from_order(order: Order, db: Session) -> TradeHistory:
    """Creates a trade record when an order is delivered."""
    # Check if trade record already exists for this order
    existing = db.query(TradeHistory).filter(TradeHistory.order_id == order.id).first()
    if existing:
        return existing

    trade_num = f"TRD-{datetime.now(timezone.utc).strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    mat_name = order.listing.material.name if order.listing and order.listing.material else "Recyclable Material"
    category = order.listing.category if order.listing else "scrap"
    listing_title = order.listing.title if order.listing else f"Order #{order.order_number}"

    carbon_saved = calculate_co2_offset(mat_name, order.requested_tons)

    trade = TradeHistory(
        trade_number=trade_num,
        order_id=order.id,
        buyer_company_id=order.buyer_company_id,
        seller_company_id=order.seller_company_id,
        listing_id=order.listing_id,
        material_id=order.listing.material_id if order.listing else None,
        material_name=mat_name,
        category=category,
        listing_title=listing_title,
        traded_tons=order.requested_tons,
        material_cost=order.material_cost,
        processing_cost=order.processing_cost,
        distance_km=order.distance_km,
        freight_cost=order.freight_cost,
        toll_cost=order.toll_estimate,
        total_landed_cost=order.total_landed_cost,
        tracking_number=order.order_number,
        carrier_name=order.carrier_name or "Industrial Freight Carrier",
        vehicle_number=order.vehicle_number or "N/A",
        dispatch_date=order.dispatch_date or order.created_at,
        delivery_date=order.delivered_date or datetime.now(timezone.utc),
        carbon_offset_kg=carbon_saved,
        status="completed",
        notes=order.seller_notes or order.buyer_notes or "Successfully completed circular trade.",
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


def serialize_trade_history(trade: TradeHistory, viewing_company_id: int) -> TradeHistoryResponse:
    is_buyer = viewing_company_id == trade.buyer_company_id
    my_role = "BUYER" if is_buyer else "SELLER"

    buyer_name = trade.buyer_company.name if trade.buyer_company else f"Buyer Enterprise #{trade.buyer_company_id}"
    seller_name = trade.seller_company.name if trade.seller_company else f"Seller Enterprise #{trade.seller_company_id}"

    counterparty_name = seller_name if is_buyer else buyer_name
    counterparty = trade.seller_company if is_buyer else trade.buyer_company
    counterparty_loc = f"{counterparty.city}, {counterparty.state}" if counterparty else "India"

    return TradeHistoryResponse(
        id=trade.id,
        trade_number=trade.trade_number,
        order_id=trade.order_id,
        buyer_company_id=trade.buyer_company_id,
        seller_company_id=trade.seller_company_id,
        listing_id=trade.listing_id,
        material_id=trade.material_id,
        material_name=trade.material_name,
        category=trade.category,
        listing_title=trade.listing_title,
        traded_tons=trade.traded_tons,
        material_cost=trade.material_cost,
        processing_cost=trade.processing_cost,
        distance_km=trade.distance_km,
        freight_cost=trade.freight_cost,
        toll_cost=trade.toll_cost,
        total_landed_cost=trade.total_landed_cost,
        my_role=my_role,
        counterparty_name=counterparty_name,
        counterparty_location=counterparty_loc,
        buyer_name=buyer_name,
        seller_name=seller_name,
        tracking_number=trade.tracking_number,
        carrier_name=trade.carrier_name,
        vehicle_number=trade.vehicle_number,
        dispatch_date=trade.dispatch_date,
        delivery_date=trade.delivery_date,
        carbon_offset_kg=trade.carbon_offset_kg,
        status=trade.status,
        notes=trade.notes,
        created_at=trade.created_at,
    )


def list_trade_history(
    company_id: int,
    role: str | None = None,  # "all", "buyer", "seller"
    db: Session = None,
) -> list[TradeHistoryResponse]:
    query = db.query(TradeHistory)

    if role == "buyer":
        query = query.filter(TradeHistory.buyer_company_id == company_id)
    elif role == "seller":
        query = query.filter(TradeHistory.seller_company_id == company_id)
    else:
        query = query.filter(
            or_(
                TradeHistory.buyer_company_id == company_id,
                TradeHistory.seller_company_id == company_id,
            )
        )

    trades = query.order_by(TradeHistory.created_at.desc()).all()
    return [serialize_trade_history(t, company_id) for t in trades]


def get_trade_stats(company_id: int, db: Session) -> TradeStatsResponse:
    all_trades = (
        db.query(TradeHistory)
        .filter(
            or_(
                TradeHistory.buyer_company_id == company_id,
                TradeHistory.seller_company_id == company_id,
            )
        )
        .all()
    )

    total_tons = sum(t.traded_tons for t in all_trades)
    total_val = sum(t.total_landed_cost for t in all_trades)
    total_co2 = sum(t.carbon_offset_kg for t in all_trades)
    as_buyer = sum(1 for t in all_trades if t.buyer_company_id == company_id)
    as_seller = sum(1 for t in all_trades if t.seller_company_id == company_id)

    return TradeStatsResponse(
        total_trades_count=len(all_trades),
        total_traded_tons=round(total_tons, 2),
        total_traded_value_inr=round(total_val, 2),
        total_co2_offset_kg=round(total_co2, 2),
        as_buyer_trades=as_buyer,
        as_seller_trades=as_seller,
    )
