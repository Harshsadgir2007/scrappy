"""
Inventory Router.

Provides endpoints for enterprise inventory tracking, material stock adjustments,
valuation summaries, and quick listing to the exchange.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_verified_company
from app.models.user import User
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
    InventorySummaryResponse,
)
from app.services import inventory_service

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=list[InventoryItemResponse])
def get_inventory(
    category: str | None = None,
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all stock inventory items for the authenticated enterprise."""
    if not current_user.company_id:
        return []
    return inventory_service.list_inventory_items(
        company_id=current_user.company_id,
        category=category,
        search=search,
        db=db,
    )


@router.get("/summary", response_model=InventorySummaryResponse)
def get_inventory_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate stock metrics: total tonnage, inventory valuation, low stock warnings."""
    if not current_user.company_id:
        return InventorySummaryResponse(
            total_stock_tons=0,
            total_valuation_inr=0,
            item_count=0,
            categories_breakdown={},
            low_stock_count=0,
        )
    return inventory_service.get_inventory_summary(
        company_id=current_user.company_id,
        db=db,
    )


@router.post("", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
def add_inventory_item(
    payload: InventoryItemCreate,
    current_user: User = Depends(require_verified_company()),
    db: Session = Depends(get_db),
):
    """Add a new raw material or by-product item into warehouse inventory."""
    try:
        return inventory_service.create_inventory_item(
            company=current_user.company,
            payload=payload,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{item_id}", response_model=InventoryItemResponse)
def update_inventory_item(
    item_id: int,
    payload: InventoryItemUpdate,
    current_user: User = Depends(require_verified_company()),
    db: Session = Depends(get_db),
):
    """Update stock quantity, costs, or storage location."""
    try:
        return inventory_service.update_inventory_item(
            company_id=current_user.company_id,
            item_id=item_id,
            payload=payload,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(
    item_id: int,
    current_user: User = Depends(require_verified_company()),
    db: Session = Depends(get_db),
):
    """Remove an item from inventory."""
    try:
        inventory_service.delete_inventory_item(
            company_id=current_user.company_id,
            item_id=item_id,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
