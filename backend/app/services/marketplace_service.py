"""
Marketplace and Order business logic service.
Implements 3-part landed cost calculation, quantity reservation, trade approvals,
order dispatch tracking, and circular inventory fulfillment.
"""

import json
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.company import Company
from app.models.listing import Listing
from app.models.material import Material
from app.models.order import Order
from app.schemas.marketplace import (
    BillEstimateRequest,
    BillEstimateResponse,
    ListingCreate,
    ListingResponse,
    OrderActionRequest,
    OrderCreate,
    OrderDispatchPayload,
    OrderResponse,
    OrderTrackingUpdatePayload,
)
from app.utils.geo import get_coordinates_for_city, haversine_distance
from app.services.intelligence_service import (
    check_compatibility,
    verify_processing_price,
    verify_quantity_sanity,
)
from app.services.notification_service import create_notification


def calculate_cost_bill(
    listing: Listing,
    buyer_company: Company,
    requested_tons: float,
) -> BillEstimateResponse:
    """Calculate the 3-part itemized landed cost bill:

    Formula: Total = (Material Price + Processing Price) * Tons + Freight Fee
    Freight Fee = (Distance km * Freight Rate * Tons) + Tolls
    """
    # 1. Material cost
    mat_cost = round(listing.price_per_ton * requested_tons, 2)

    # 2. Processing cost
    proc_cost = 0.0
    if listing.is_processed and listing.processing_cost_per_ton > 0:
        proc_cost = round(listing.processing_cost_per_ton * requested_tons, 2)

    # 3. Geo Distance & Transport cost
    # Get seller coords
    s_lat = listing.pickup_latitude
    s_lon = listing.pickup_longitude
    if not s_lat or not s_lon:
        s_lat, s_lon = get_coordinates_for_city(listing.pickup_city)

    # Get buyer coords
    b_lat = buyer_company.latitude
    b_lon = buyer_company.longitude
    if not b_lat or not b_lon:
        b_lat, b_lon = get_coordinates_for_city(buyer_company.city)

    distance = haversine_distance(s_lat, s_lon, b_lat, b_lon)
    # Minimum realistic distance threshold
    distance = max(distance, 15.0)

    # Use listing specified freight rate or standard freight rate ~ INR 3.5 per ton per km
    freight_rate = listing.freight_rate_per_ton_km if listing.freight_rate_per_ton_km else 3.5
    freight_cost = round(distance * freight_rate * requested_tons, 2)

    # Toll estimate: use listing's toll estimate if provided, else distance estimate
    if listing.toll_estimate and listing.toll_estimate > 0:
        tolls = round(listing.toll_estimate, 2)
    else:
        tolls = round((distance / 100.0) * 250.0, 2) if distance > 60 else 0.0

    total_landed = round(mat_cost + proc_cost + freight_cost + tolls, 2)
    effective_rate = round(total_landed / requested_tons, 2)

    return BillEstimateResponse(
        listing_id=listing.id,
        requested_tons=requested_tons,
        material_unit_price=listing.price_per_ton,
        material_cost=mat_cost,
        is_processed=listing.is_processed,
        processing_unit_price=listing.processing_cost_per_ton,
        processing_cost=proc_cost,
        distance_km=distance,
        freight_rate_per_ton_km=freight_rate,
        freight_cost=freight_cost,
        toll_estimate=tolls,
        total_landed_cost=total_landed,
        effective_landed_price_per_ton=effective_rate,
    )


# ── Listing Services ───────────────────────────────────────────────────

def create_listing(company: Company, payload: ListingCreate, db: Session) -> Listing:
    if payload.price_per_ton < payload.min_price_floor:
        raise ValueError("Price per ton cannot be lower than the minimum price floor.")

    # Geocode coordinates if not sent
    lat = payload.pickup_latitude
    lon = payload.pickup_longitude
    if not lat or not lon:
        lat, lon = get_coordinates_for_city(payload.pickup_city)

    listing_status = "coming_soon" if payload.is_coming_soon else "live"

    listing = Listing(
        company_id=company.id,
        material_id=payload.material_id,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        total_tons=payload.total_tons,
        remaining_tons=payload.total_tons,
        reserved_tons=0.0,
        price_per_ton=payload.price_per_ton,
        min_price_floor=payload.min_price_floor,
        min_order_tons=payload.min_order_tons,
        is_processed=payload.is_processed,
        processing_details=payload.processing_details,
        processing_cost_per_ton=payload.processing_cost_per_ton if payload.is_processed else 0.0,
        pickup_address=payload.pickup_address,
        pickup_city=payload.pickup_city,
        pickup_state=payload.pickup_state,
        pickup_pincode=payload.pickup_pincode,
        pickup_latitude=lat,
        pickup_longitude=lon,
        freight_rate_per_ton_km=payload.freight_rate_per_ton_km,
        toll_estimate=payload.toll_estimate,
        is_coming_soon=payload.is_coming_soon,
        expected_available_date=payload.expected_available_date,
        expected_tons=payload.expected_tons or payload.total_tons,
        status=listing_status,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


def list_marketplace_listings(
    db: Session,
    viewing_company: Company | None = None,
    category: str | None = None,
    material_id: int | None = None,
    search: str | None = None,
    city: str | None = None,
    is_coming_soon: bool | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[ListingResponse]:
    query = db.query(Listing).filter(Listing.remaining_tons > 0)

    if is_coming_soon is not None:
        if is_coming_soon:
            query = query.filter(Listing.status == "coming_soon")
        else:
            query = query.filter(Listing.status == "live")
    else:
        query = query.filter(Listing.status.in_(["live", "coming_soon"]))

    if category and category != "all":
        query = query.filter(Listing.category.ilike(f"%{category}%"))
    if material_id:
        query = query.filter(Listing.material_id == material_id)
    if city:
        query = query.filter(Listing.pickup_city.ilike(f"%{city}%"))
    if search:
        query = query.join(Material).filter(
            or_(
                Listing.title.ilike(f"%{search}%"),
                Listing.description.ilike(f"%{search}%"),
                Material.name.ilike(f"%{search}%"),
            )
        )

    listings = query.order_by(Listing.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    for l in listings:
        compat = None
        if viewing_company:
            compat = check_compatibility(l, viewing_company)

        results.append(
            ListingResponse(
                id=l.id,
                company_id=l.company_id,
                material_id=l.material_id,
                material_name=l.material.name if l.material else "Industrial Material",
                material_category=l.material.category if l.material else "general",
                category=l.category,
                title=l.title,
                description=l.description,
                total_tons=l.total_tons,
                remaining_tons=l.remaining_tons,
                reserved_tons=l.reserved_tons,
                price_per_ton=l.price_per_ton,
                min_order_tons=l.min_order_tons,
                is_processed=l.is_processed,
                processing_details=l.processing_details,
                processing_cost_per_ton=l.processing_cost_per_ton,
                freight_rate_per_ton_km=l.freight_rate_per_ton_km,
                toll_estimate=l.toll_estimate,
                seller_label=f"Verified Producer #{1000 + l.company_id}",
                pickup_city=l.pickup_city,
                pickup_state=l.pickup_state,
                compatibility=compat,
                is_coming_soon=l.is_coming_soon,
                expected_available_date=l.expected_available_date,
                expected_tons=l.expected_tons,
                status=l.status,
                created_at=l.created_at,
            )
        )
    return results


# ── Order Services ─────────────────────────────────────────────────────

def place_order(buyer_company: Company, payload: OrderCreate, db: Session) -> Order:
    listing = db.query(Listing).filter(Listing.id == payload.listing_id).first()
    if not listing:
        raise ValueError("Listing not found.")

    if listing.status not in ("live", "coming_soon"):
        raise ValueError("Listing is no longer active.")

    if listing.company_id == buyer_company.id:
        raise ValueError("You cannot purchase scrap from your own listing.")

    if payload.requested_tons > listing.remaining_tons:
        raise ValueError(f"Requested quantity ({payload.requested_tons} T) exceeds available remaining tons ({listing.remaining_tons} T).")

    if payload.requested_tons < listing.min_order_tons:
        raise ValueError(f"Order must meet minimum partial quantity of {listing.min_order_tons} tons.")

    # Intelligence: Compatibility Check (PRD F2.4 & F2.5)
    compat = check_compatibility(listing, buyer_company)
    if not compat["is_compatible"] and not payload.compatibility_override:
        raise ValueError(
            "COMPATIBILITY_WARNING: This material is not suitable for your registered products. "
            "To proceed, explicit confirmation of secondary process capability is required."
        )

    # Intelligence: Anti-hoarding & capacity sanity check (PRD Section 7)
    sanity = verify_quantity_sanity(buyer_company, payload.requested_tons)

    # Calculate authoritative landed cost bill
    bill = calculate_cost_bill(listing, buyer_company, payload.requested_tons)

    order_num = f"PRG-{datetime.now(timezone.utc).strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    # Reserve quantity (PRD F4.4)
    listing.remaining_tons = round(listing.remaining_tons - payload.requested_tons, 2)
    listing.reserved_tons = round(listing.reserved_tons + payload.requested_tons, 2)

    is_prebook = listing.status == "coming_soon"

    # Initialize tracking history milestone
    init_tracking = [
        {
            "status": "pending",
            "title": "Order Placed",
            "location": f"{buyer_company.city}, {buyer_company.state}",
            "notes": payload.buyer_notes or "Purchase request submitted for seller approval.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    ]

    order = Order(
        order_number=order_num,
        listing_id=listing.id,
        buyer_company_id=buyer_company.id,
        seller_company_id=listing.company_id,
        requested_tons=payload.requested_tons,
        material_cost=bill.material_cost,
        processing_cost=bill.processing_cost,
        distance_km=bill.distance_km,
        freight_rate_per_ton_km=bill.freight_rate_per_ton_km,
        freight_cost=bill.freight_cost,
        toll_estimate=bill.toll_estimate,
        total_landed_cost=bill.total_landed_cost,
        status="pending",
        buyer_notes=payload.buyer_notes,
        is_prebook=is_prebook,
        compatibility_override=payload.compatibility_override,
        override_reason=payload.override_reason if payload.compatibility_override else None,
        capacity_sanity_warning=sanity["warning"],
        reservation_expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
        tracking_history=json.dumps(init_tracking),
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Dispatch in-app notification to Seller
    create_notification(
        db=db,
        company_id=listing.company_id,
        title="New Purchase Request Received!" if not is_prebook else "New Pre-Booking Request!",
        message=(
            f"An industrial enterprise placed a request for {payload.requested_tons} Tons "
            f"of '{listing.title}' (Total Landed: ₹{bill.total_landed_cost:,})."
        ),
        notif_type="order_received",
        link="/orders",
    )
    return order


def handle_order_action(
    order_id: int,
    seller_company: Company,
    payload: OrderActionRequest,
    db: Session,
) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError("Order not found.")

    if order.seller_company_id != seller_company.id:
        raise ValueError("Unauthorized. You are not the seller of this order.")

    if order.status != "pending":
        raise ValueError(f"Cannot perform action on an order with status '{order.status}'.")

    listing = order.listing
    history = json.loads(order.tracking_history) if order.tracking_history else []

    if payload.action == "approve":
        order.status = "approved"
        order.seller_notes = payload.seller_notes
        # Deduct permanently from reserved tons
        listing.reserved_tons = max(0.0, round(listing.reserved_tons - order.requested_tons, 2))
        if listing.remaining_tons <= 0 and listing.reserved_tons <= 0:
            listing.status = "closed"

        history.append({
            "status": "approved",
            "title": "Order Approved & Confirmed",
            "location": f"{seller_company.city}, {seller_company.state}",
            "notes": payload.seller_notes or "Order approved by seller. Readying dispatch consignment.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        order.tracking_history = json.dumps(history)

        # Dispatch notification to Buyer
        create_notification(
            db=db,
            company_id=order.buyer_company_id,
            title="Order Approved by Seller!",
            message=f"Your purchase order #{order.order_number} for {order.requested_tons} Tons has been approved by {seller_company.name}.",
            notif_type="order_approved",
            link="/orders",
        )

    elif payload.action == "reject":
        order.status = "rejected"
        order.seller_notes = payload.seller_notes
        # Release reserved tons back to remaining
        listing.reserved_tons = max(0.0, round(listing.reserved_tons - order.requested_tons, 2))
        listing.remaining_tons = round(listing.remaining_tons + order.requested_tons, 2)

        history.append({
            "status": "rejected",
            "title": "Order Request Declined",
            "location": f"{seller_company.city}, {seller_company.state}",
            "notes": payload.seller_notes or "Declined by seller.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        order.tracking_history = json.dumps(history)

        create_notification(
            db=db,
            company_id=order.buyer_company_id,
            title="Order Request Declined",
            message=f"Purchase request #{order.order_number} could not be accepted. Note: {payload.seller_notes or 'No reason provided'}.",
            notif_type="order_rejected",
            link="/orders",
        )

    elif payload.action == "counter":
        if not payload.counter_tons or payload.counter_tons <= 0:
            raise ValueError("Counter offer must specify counter_tons.")
        order.status = "countered"
        order.counter_tons = payload.counter_tons
        order.seller_notes = payload.seller_notes

        # Adjust reserved difference
        diff = order.requested_tons - payload.counter_tons
        listing.reserved_tons = max(0.0, round(listing.reserved_tons - diff, 2))
        listing.remaining_tons = round(listing.remaining_tons + diff, 2)

        history.append({
            "status": "countered",
            "title": "Counter Offer Proposed",
            "location": f"{seller_company.city}, {seller_company.state}",
            "notes": f"Seller offered {payload.counter_tons} Tons. Note: {payload.seller_notes or 'None'}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        order.tracking_history = json.dumps(history)

        create_notification(
            db=db,
            company_id=order.buyer_company_id,
            title="Counter Offer Received!",
            message=f"Seller proposed an updated volume of {payload.counter_tons} Tons for order #{order.order_number}.",
            notif_type="order_countered",
            link="/orders",
        )

    db.commit()
    db.refresh(order)
    return order


# ── Order Tracking Lifecycle ───────────────────────────────────────────

def dispatch_order(
    order_id: int,
    seller_company: Company,
    payload: OrderDispatchPayload,
    db: Session,
) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError("Order not found.")

    if order.seller_company_id != seller_company.id:
        raise ValueError("Unauthorized. Only the seller can dispatch this consignment.")

    if order.status not in ("approved", "countered"):
        raise ValueError(f"Cannot dispatch order in '{order.status}' status. Order must be approved first.")

    now = datetime.now(timezone.utc)
    order.status = "dispatched"
    order.carrier_name = payload.carrier_name
    order.vehicle_number = payload.vehicle_number
    order.driver_phone = payload.driver_phone
    order.dispatch_date = now
    order.estimated_delivery_date = now + timedelta(days=payload.estimated_delivery_days)
    origin_city = order.listing.pickup_city if order.listing else seller_company.city
    order.current_location = f"Dispatched from {origin_city} Facility"

    history = json.loads(order.tracking_history) if order.tracking_history else []
    history.append({
        "status": "dispatched",
        "title": "Consignment Dispatched",
        "location": f"{origin_city}, {order.listing.pickup_state if order.listing else seller_company.state}",
        "notes": f"Carrier: {payload.carrier_name} | Vehicle No: {payload.vehicle_number}" + (f" | Driver: {payload.driver_phone}" if payload.driver_phone else "") + (f" | Note: {payload.dispatch_notes}" if payload.dispatch_notes else ""),
        "timestamp": now.isoformat(),
    })
    order.tracking_history = json.dumps(history)

    db.commit()
    db.refresh(order)

    # Notify Buyer of dispatch
    create_notification(
        db=db,
        company_id=order.buyer_company_id,
        title="Order Dispatched!",
        message=(
            f"Consignment for Order #{order.order_number} ({order.requested_tons} Tons) has been dispatched "
            f"via {payload.carrier_name} (Vehicle: {payload.vehicle_number})."
        ),
        notif_type="order_dispatched",
        link="/orders",
    )
    return order


def update_order_tracking(
    order_id: int,
    company: Company,
    payload: OrderTrackingUpdatePayload,
    db: Session,
) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError("Order not found.")

    if company.id not in (order.seller_company_id, order.buyer_company_id):
        raise ValueError("Unauthorized to update tracking for this order.")

    now = datetime.now(timezone.utc)
    order.status = payload.status
    order.current_location = payload.current_location

    history = json.loads(order.tracking_history) if order.tracking_history else []
    title = "In Transit - Checkpoint Update" if payload.status == "in_transit" else "Delivery Progress"
    history.append({
        "status": payload.status,
        "title": title,
        "location": payload.current_location,
        "notes": payload.notes or "Consignment advancing on highway logistics corridor.",
        "timestamp": now.isoformat(),
    })
    order.tracking_history = json.dumps(history)

    db.commit()
    db.refresh(order)

    # Notify counterpart
    other_party_id = order.buyer_company_id if company.id == order.seller_company_id else order.seller_company_id
    create_notification(
        db=db,
        company_id=other_party_id,
        title="Transit Checkpoint Update",
        message=f"Order #{order.order_number} checkpoint: {payload.current_location}.",
        notif_type="tracking_update",
        link="/orders",
    )
    return order


def deliver_order(
    order_id: int,
    company: Company,
    db: Session,
) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError("Order not found.")

    if company.id not in (order.seller_company_id, order.buyer_company_id):
        raise ValueError("Unauthorized to confirm delivery for this order.")

    if order.status in ("delivered", "completed"):
        return order

    if order.status not in ("dispatched", "in_transit", "approved"):
        raise ValueError(f"Cannot deliver order in '{order.status}' status.")

    now = datetime.now(timezone.utc)
    order.status = "delivered"
    order.delivered_date = now
    dest_city = order.buyer_company.city if order.buyer_company else "Destination"
    order.current_location = f"Delivered at {dest_city} Facility"

    history = json.loads(order.tracking_history) if order.tracking_history else []
    history.append({
        "status": "delivered",
        "title": "Delivered & Verified",
        "location": f"{dest_city}, {order.buyer_company.state if order.buyer_company else ''}",
        "notes": f"Material verified and accepted into {order.buyer_company.name} stock.",
        "timestamp": now.isoformat(),
    })
    order.tracking_history = json.dumps(history)

    # ── 1. Create Immutable Trade Record for Both Parties ──
    from app.services.trade_service import record_trade_from_order
    record_trade_from_order(order, db)

    # ── 2. Cross-Synchronize Inventory at Both Ends ──
    from app.services.inventory_service import deduct_inventory_on_delivery, credit_inventory_on_delivery
    mat_name = order.listing.material.name if order.listing and order.listing.material else "Scrap"
    cat = order.listing.category if order.listing else "scrap"

    # Deduct from seller's physical inventory
    deduct_inventory_on_delivery(
        company_id=order.seller_company_id,
        material_name=mat_name,
        category=cat,
        tons=order.requested_tons,
        db=db,
    )

    # Credit into buyer's physical inventory
    cost_per_ton = order.material_cost / order.requested_tons if order.requested_tons else 0.0
    credit_inventory_on_delivery(
        buyer_company=order.buyer_company,
        material_name=mat_name,
        category=cat,
        tons=order.requested_tons,
        cost_per_ton=cost_per_ton,
        is_processed=order.listing.is_processed if order.listing else False,
        processed_cost=order.listing.processing_cost_per_ton if order.listing else 0.0,
        db=db,
    )

    db.commit()
    db.refresh(order)

    # Notify both sides
    create_notification(
        db=db,
        company_id=order.seller_company_id,
        title="Order Delivered & Trade Settled!",
        message=f"Order #{order.order_number} ({order.requested_tons} Tons) marked delivered. Trade recorded in permanent ledger.",
        notif_type="order_delivered",
        link="/orders",
    )
    create_notification(
        db=db,
        company_id=order.buyer_company_id,
        title="Delivery Confirmed & Stock Synced!",
        message=f"Order #{order.order_number} confirmed delivered. {order.requested_tons} Tons added to your inventory.",
        notif_type="order_delivered",
        link="/orders",
    )
    return order


def serialize_order(order: Order, viewing_company_id: int) -> OrderResponse:
    # Strict confidentiality: reveal real identity only upon approval or further stages
    is_approved = order.status in ("approved", "dispatched", "in_transit", "delivered", "completed")
    is_seller = viewing_company_id == order.seller_company_id
    is_buyer = viewing_company_id == order.buyer_company_id

    if is_approved or is_seller:
        seller_label = order.seller_company.name
        pickup_loc = f"{order.listing.pickup_city}, {order.listing.pickup_state} ({order.listing.pickup_address or 'Factory gate'})"
    else:
        seller_label = f"Verified Producer #{1000 + order.seller_company_id}"
        pickup_loc = f"{order.listing.pickup_city}, {order.listing.pickup_state}"

    if is_approved or is_buyer:
        buyer_label = order.buyer_company.name
    else:
        buyer_label = f"Industrial Buyer #{1000 + order.buyer_company_id}"

    history_list = []
    if order.tracking_history:
        try:
            history_list = json.loads(order.tracking_history)
        except Exception:
            history_list = []

    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        listing_id=order.listing_id,
        listing_title=order.listing.title,
        material_name=order.listing.material.name if order.listing and order.listing.material else "Scrap",
        buyer_company_id=order.buyer_company_id,
        seller_company_id=order.seller_company_id,
        seller_name=seller_label,
        buyer_name=buyer_label,
        pickup_location=pickup_loc,
        requested_tons=order.requested_tons,
        material_cost=order.material_cost,
        processing_cost=order.processing_cost,
        distance_km=order.distance_km,
        freight_cost=order.freight_cost,
        toll_estimate=order.toll_estimate,
        total_landed_cost=order.total_landed_cost,
        status=order.status,
        carrier_name=order.carrier_name,
        vehicle_number=order.vehicle_number,
        driver_phone=order.driver_phone,
        dispatch_date=order.dispatch_date,
        estimated_delivery_date=order.estimated_delivery_date,
        delivered_date=order.delivered_date,
        current_location=order.current_location,
        tracking_history=history_list,
        is_prebook=order.is_prebook,
        compatibility_override=order.compatibility_override,
        override_reason=order.override_reason,
        capacity_sanity_warning=order.capacity_sanity_warning,
        counter_tons=order.counter_tons,
        seller_notes=order.seller_notes,
        buyer_notes=order.buyer_notes,
        reservation_expires_at=order.reservation_expires_at,
        created_at=order.created_at,
    )
