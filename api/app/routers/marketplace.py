"""
Marketplace router — listings, landed cost estimates, variable quantity orders, and order tracking.
Enforces verified enterprise status and active company subscriptions (INR 2,500/yr) on protected operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_active_subscription, require_verified_company
from app.models.listing import Listing
from app.models.order import Order
from app.models.user import User
from app.schemas.marketplace import (
    BillEstimateRequest,
    BillEstimateResponse,
    ListingCreate,
    ListingResponse,
    ListingUpdate,
    OrderActionRequest,
    OrderCreate,
    OrderDispatchPayload,
    OrderResponse,
    OrderTrackingUpdatePayload,
)
from app.services import marketplace_service

router = APIRouter(tags=["Marketplace"])


# ── Listings Endpoints ──────────────────────────────────────────────────

@router.get("/listings", response_model=list[ListingResponse])
def get_listings(
    category: str | None = None,
    material_id: int | None = None,
    search: str | None = None,
    city: str | None = None,
    is_coming_soon: bool | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Browse live marketplace listings with anonymized seller info & compatibility badges.
    Only listings with approved quality certificates are displayed.
    """
    return marketplace_service.list_marketplace_listings(
        db=db,
        viewing_company=current_user.company,
        category=category,
        material_id=material_id,
        search=search,
        city=city,
        is_coming_soon=is_coming_soon,
        skip=skip,
        limit=limit,
    )


@router.post("/listings", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_new_listing(
    payload: ListingCreate,
    current_user: User = Depends(require_active_subscription()),
    db: Session = Depends(get_db),
):
    """Post scrap, leftover or by-product listing (Requires active company subscription)."""
    try:
        listing = marketplace_service.create_listing(current_user.company, payload, db)
        return ListingResponse(
            id=listing.id,
            company_id=listing.company_id,
            material_id=listing.material_id,
            material_name=listing.material.name if listing.material else "Scrap",
            material_category=listing.material.category if listing.material else "general",
            category=listing.category,
            title=listing.title,
            description=listing.description,
            total_tons=listing.total_tons,
            remaining_tons=listing.remaining_tons,
            reserved_tons=listing.reserved_tons,
            price_per_ton=listing.price_per_ton,
            min_order_tons=listing.min_order_tons,
            is_processed=listing.is_processed,
            processing_details=listing.processing_details,
            processing_cost_per_ton=listing.processing_cost_per_ton,
            freight_rate_per_ton_km=listing.freight_rate_per_ton_km,
            toll_estimate=listing.toll_estimate,
            seller_label=f"Verified Producer #{1000 + listing.company_id}",
            pickup_city=listing.pickup_city,
            pickup_state=listing.pickup_state,
            quality_status=listing.quality_status,
            status=listing.status,
            created_at=listing.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/listings/my-listings", response_model=list[ListingResponse])
def get_my_company_listings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all listings published by the caller's company (including drafts and pending review)."""
    if not current_user.company_id:
        return []
    listings = (
        db.query(Listing)
        .filter(Listing.company_id == current_user.company_id)
        .order_by(Listing.created_at.desc())
        .all()
    )
    results = []
    for l in listings:
        cert_preview = None
        if l.quality_certificate:
            cert_preview = {
                "id": l.quality_certificate.id,
                "certificate_number": l.quality_certificate.certificate_number,
                "testing_lab_name": l.quality_certificate.testing_lab_name,
                "lab_accreditation": l.quality_certificate.lab_accreditation,
                "review_status": l.quality_certificate.review_status,
                "original_filename": l.quality_certificate.original_filename,
                "reviewer_comments": l.quality_certificate.reviewer_comments,
            }
        results.append(
            ListingResponse(
                id=l.id,
                company_id=l.company_id,
                material_id=l.material_id,
                material_name=l.material.name if l.material else "Scrap",
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
                seller_label="Your Company",
                pickup_city=l.pickup_city,
                pickup_state=l.pickup_state,
                quality_status=l.quality_status,
                quality_certificate=cert_preview,
                status=l.status,
                created_at=l.created_at,
            )
        )
    return results


# ── Landed Cost Bill Endpoint ───────────────────────────────────────────

@router.post("/bill/estimate", response_model=BillEstimateResponse)
def estimate_cost_bill(
    payload: BillEstimateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate 3-part itemized landed cost bill + transaction commission estimate."""
    listing = db.query(Listing).filter(Listing.id == payload.listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    company = current_user.company
    if not company:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No company profile found")

    return marketplace_service.calculate_cost_bill(listing, company, payload.requested_tons)


# ── Orders Endpoints ────────────────────────────────────────────────────

@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def submit_purchase_order(
    payload: OrderCreate,
    current_user: User = Depends(require_active_subscription()),
    db: Session = Depends(get_db),
):
    """Place purchase request (Requires active company subscription)."""
    try:
        order = marketplace_service.place_order(current_user.company, payload, db)
        return marketplace_service.serialize_order(order, current_user.company_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/orders/my-purchases", response_model=list[OrderResponse])
def get_my_purchases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Orders where current user's company is the Buyer."""
    if not current_user.company_id:
        return []
    orders = (
        db.query(Order)
        .filter(Order.buyer_company_id == current_user.company_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [marketplace_service.serialize_order(o, current_user.company_id) for o in orders]


@router.get("/orders/my-sales", response_model=list[OrderResponse])
def get_my_sales(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Incoming order requests where current user's company is the Seller."""
    if not current_user.company_id:
        return []
    orders = (
        db.query(Order)
        .filter(Order.seller_company_id == current_user.company_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [marketplace_service.serialize_order(o, current_user.company_id) for o in orders]


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_order_details(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch order details, commission breakdown, and full tracking history."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if current_user.role != "admin" and current_user.company_id not in (order.buyer_company_id, order.seller_company_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return marketplace_service.serialize_order(order, current_user.company_id or 0)


@router.put("/orders/{order_id}/action", response_model=OrderResponse)
def act_on_order(
    order_id: int,
    payload: OrderActionRequest,
    current_user: User = Depends(require_active_subscription()),
    db: Session = Depends(get_db),
):
    """Seller approves, rejects, or counters an incoming order request."""
    try:
        order = marketplace_service.handle_order_action(
            order_id=order_id,
            seller_company=current_user.company,
            payload=payload,
            db=db,
        )
        return marketplace_service.serialize_order(order, current_user.company_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── Order Tracking Endpoints ───────────────────────────────────────────

@router.put("/orders/{order_id}/dispatch", response_model=OrderResponse)
def dispatch_order(
    order_id: int,
    payload: OrderDispatchPayload,
    current_user: User = Depends(require_active_subscription()),
    db: Session = Depends(get_db),
):
    """Seller dispatches consignment."""
    try:
        order = marketplace_service.dispatch_order(
            order_id=order_id,
            seller_company=current_user.company,
            payload=payload,
            db=db,
        )
        return marketplace_service.serialize_order(order, current_user.company_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/orders/{order_id}/tracking", response_model=OrderResponse)
def update_tracking_checkpoint(
    order_id: int,
    payload: OrderTrackingUpdatePayload,
    current_user: User = Depends(require_active_subscription()),
    db: Session = Depends(get_db),
):
    """Log transit milestone checkpoint."""
    try:
        order = marketplace_service.update_order_tracking(
            order_id=order_id,
            company=current_user.company,
            payload=payload,
            db=db,
        )
        return marketplace_service.serialize_order(order, current_user.company_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/orders/{order_id}/deliver", response_model=OrderResponse)
def deliver_order(
    order_id: int,
    current_user: User = Depends(require_active_subscription()),
    db: Session = Depends(get_db),
):
    """Buyer verifies delivery and signs off."""
    try:
        order = marketplace_service.deliver_order(
            order_id=order_id,
            buyer_company=current_user.company,
            db=db,
        )
        return marketplace_service.serialize_order(order, current_user.company_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
