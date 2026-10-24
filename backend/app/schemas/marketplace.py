"""
Pydantic schemas for Listings, Cost Bills, Orders, and Order Tracking.
"""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Listing Schemas ─────────────────────────────────────────────────────

class ListingCreate(BaseModel):
    material_id: int
    category: str = Field(default="scrap", description="'steel scrap', 'fly ash', 'textile waste', 'scrap', 'by_product', or 'leftover'")
    title: str = Field(..., min_length=3)
    description: str | None = None
    total_tons: float = Field(..., gt=0)
    price_per_ton: float = Field(..., gt=0)  # Actual cost / asking price
    min_price_floor: float = Field(..., gt=0)
    min_order_tons: float = Field(default=1.0, gt=0)
    is_processed: bool = False
    processing_details: str | None = None
    processing_cost_per_ton: float = 0.0
    pickup_address: str | None = None
    pickup_city: str
    pickup_state: str
    pickup_pincode: str | None = None
    pickup_latitude: float | None = None
    pickup_longitude: float | None = None
    freight_rate_per_ton_km: float = 3.5
    toll_estimate: float = 0.0

    # Phase 4 Pre-Book
    is_coming_soon: bool = False
    expected_available_date: datetime | None = None
    expected_tons: float | None = None


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price_per_ton: float | None = None
    min_order_tons: float | None = None
    status: str | None = None


class ListingResponse(BaseModel):
    id: int
    company_id: int
    material_id: int
    material_name: str
    material_category: str
    category: str
    title: str
    description: str | None = None
    total_tons: float
    remaining_tons: float
    reserved_tons: float
    price_per_ton: float
    min_order_tons: float
    is_processed: bool
    processing_details: str | None = None
    processing_cost_per_ton: float
    freight_rate_per_ton_km: float = 3.5
    toll_estimate: float = 0.0

    # Privacy Anonymization (PRD F1.5 & F5)
    seller_label: str  # e.g. "Verified Producer #1042"
    pickup_city: str
    pickup_state: str

    # Quality Certification
    quality_status: str = "approved"
    quality_certificate: dict | None = None

    # Intelligence Suite (PRD F2)
    compatibility: dict | None = None

    # Phase 4 Pre-Book & Coming Soon (PRD F7)
    is_coming_soon: bool = False
    expected_available_date: datetime | None = None
    expected_tons: float | None = None

    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Cost Bill Schemas ───────────────────────────────────────────────────

class BillEstimateRequest(BaseModel):
    listing_id: int
    requested_tons: float = Field(..., gt=0)


class BillEstimateResponse(BaseModel):
    listing_id: int
    requested_tons: float
    material_unit_price: float
    material_cost: float
    is_processed: bool
    processing_unit_price: float
    processing_cost: float
    distance_km: float
    freight_rate_per_ton_km: float
    freight_cost: float
    toll_estimate: float
    total_landed_cost: float
    effective_landed_price_per_ton: float

    # Platform Commission Breakdown (for material values > INR 5,00,000)
    commission: dict | None = None


# ── Order Schemas ───────────────────────────────────────────────────────

class OrderCreate(BaseModel):
    listing_id: int
    requested_tons: float = Field(..., gt=0)
    buyer_notes: str | None = None
    compatibility_override: bool = False
    override_reason: str | None = None


class OrderActionRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|counter)$")
    counter_tons: float | None = None
    seller_notes: str | None = None


class OrderDispatchPayload(BaseModel):
    carrier_name: str = Field(..., min_length=2, description="Logistics partner or fleet name")
    vehicle_number: str = Field(..., min_length=4, description="Truck / Vehicle Registration number (e.g. MH-12-AB-1234)")
    driver_phone: str | None = None
    estimated_delivery_days: int = Field(default=2, ge=1)
    dispatch_notes: str | None = None


class OrderTrackingUpdatePayload(BaseModel):
    status: str = Field(..., pattern="^(dispatched|in_transit|delivered)$")
    current_location: str = Field(..., min_length=2)
    notes: str | None = None


class OrderTrackingMilestone(BaseModel):
    status: str
    title: str
    location: str | None = None
    notes: str | None = None
    timestamp: str


class OrderResponse(BaseModel):
    id: int
    order_number: str
    listing_id: int
    listing_title: str
    material_name: str
    buyer_company_id: int
    seller_company_id: int

    # Privacy: Anonymous until approved
    seller_name: str
    buyer_name: str
    pickup_location: str

    requested_tons: float
    material_cost: float
    processing_cost: float
    distance_km: float
    freight_cost: float
    toll_estimate: float
    total_landed_cost: float

    # Transaction Commission
    commission: dict | None = None

    # Status & Tracking
    status: str
    carrier_name: str | None = None
    vehicle_number: str | None = None
    driver_phone: str | None = None
    dispatch_date: datetime | None = None
    estimated_delivery_date: datetime | None = None
    delivered_date: datetime | None = None
    current_location: str | None = None
    tracking_history: list[dict] | None = None

    is_prebook: bool = False
    compatibility_override: bool = False
    override_reason: str | None = None
    capacity_sanity_warning: str | None = None
    counter_tons: float | None = None
    seller_notes: str | None = None
    buyer_notes: str | None = None
    reservation_expires_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True
