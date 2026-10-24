"""
Pydantic schemas for Transaction Commission endpoints.
"""

from datetime import datetime
from pydantic import BaseModel


class CommissionBreakdownResponse(BaseModel):
    is_eligible: bool
    material_transaction_value: float
    commission_rate: float
    total_commission: float
    buyer_rate: float
    buyer_contribution: float
    seller_rate: float
    seller_contribution: float
    status: str = "calculated"
    buyer_collection_status: str = "uncollected"
    seller_collection_status: str = "uncollected"

    model_config = {"from_attributes": True}
