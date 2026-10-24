"""
Pydantic schemas for Enterprise Inventory management.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class InventoryItemCreate(BaseModel):
    material_id: int | None = None
    material_name: str
    category: str = Field(..., description="e.g. 'steel scrap', 'fly ash', 'textile waste', 'chemical', 'metal'")
    title: str = Field(..., min_length=2)
    description: str | None = None
    quantity_tons: float = Field(..., gt=0, description="Available stock quantity in metric tons")
    actual_cost_per_ton: float = Field(..., ge=0, description="Base material acquisition / production cost per ton")
    is_processed: bool = False
    processing_details: str | None = None
    processed_cost_per_ton: float = Field(default=0.0, ge=0)
    storage_location: str | None = None
    city: str
    state: str
    pincode: str | None = None
    freight_rate_per_ton_km: float = 3.5
    estimated_tolls: float = 0.0
    notes: str | None = None


class InventoryItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    quantity_tons: float | None = None
    actual_cost_per_ton: float | None = None
    is_processed: bool | None = None
    processing_details: str | None = None
    processed_cost_per_ton: float | None = None
    storage_location: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    freight_rate_per_ton_km: float | None = None
    estimated_tolls: float | None = None
    status: str | None = None
    notes: str | None = None


class InventoryItemResponse(BaseModel):
    id: int
    company_id: int
    material_id: int | None = None
    material_name: str
    category: str
    title: str
    description: str | None = None
    quantity_tons: float
    reserved_tons: float
    available_tons: float
    actual_cost_per_ton: float
    is_processed: bool
    processing_details: str | None = None
    processed_cost_per_ton: float
    total_unit_cost: float
    total_valuation: float
    storage_location: str | None = None
    city: str
    state: str
    pincode: str | None = None
    freight_rate_per_ton_km: float
    estimated_tolls: float
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class InventorySummaryResponse(BaseModel):
    total_stock_tons: float
    total_valuation_inr: float
    item_count: int
    categories_breakdown: dict[str, float]
    low_stock_count: int
