"""
Pydantic schemas for Trade History.
"""

from datetime import datetime
from pydantic import BaseModel


class TradeHistoryResponse(BaseModel):
    id: int
    trade_number: str
    order_id: int
    buyer_company_id: int
    seller_company_id: int
    listing_id: int | None = None
    material_id: int | None = None

    material_name: str
    category: str
    listing_title: str
    traded_tons: float

    # Landed Cost Breakdown (INR)
    material_cost: float
    processing_cost: float
    distance_km: float
    freight_cost: float
    toll_cost: float
    total_landed_cost: float

    # Parties info
    my_role: str  # "BUYER" or "SELLER"
    counterparty_name: str
    counterparty_location: str
    buyer_name: str
    seller_name: str

    # Logistics info
    tracking_number: str | None = None
    carrier_name: str | None = None
    vehicle_number: str | None = None
    dispatch_date: datetime | None = None
    delivery_date: datetime

    # Circular Economy & Carbon offset
    carbon_offset_kg: float
    status: str
    notes: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class TradeStatsResponse(BaseModel):
    total_trades_count: int
    total_traded_tons: float
    total_traded_value_inr: float
    total_co2_offset_kg: float
    as_buyer_trades: int
    as_seller_trades: int
