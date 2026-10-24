"""
Inventory Service.

Handles warehouse inventory tracking, stock adjustments, valuation,
and cross-synchronization with marketplace listings and delivered trades.
"""

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.company import Company
from app.models.inventory import InventoryItem
from app.models.material import Material
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
    InventorySummaryResponse,
)


def serialize_inventory_item(item: InventoryItem) -> InventoryItemResponse:
    available = max(0.0, round(item.quantity_tons - item.reserved_tons, 2))
    total_unit_cost = round(item.actual_cost_per_ton + (item.processed_cost_per_ton if item.is_processed else 0.0), 2)
    valuation = round(item.quantity_tons * total_unit_cost, 2)

    return InventoryItemResponse(
        id=item.id,
        company_id=item.company_id,
        material_id=item.material_id,
        material_name=item.material_name,
        category=item.category,
        title=item.title,
        description=item.description,
        quantity_tons=item.quantity_tons,
        reserved_tons=item.reserved_tons,
        available_tons=available,
        actual_cost_per_ton=item.actual_cost_per_ton,
        is_processed=item.is_processed,
        processing_details=item.processing_details,
        processed_cost_per_ton=item.processed_cost_per_ton,
        total_unit_cost=total_unit_cost,
        total_valuation=valuation,
        storage_location=item.storage_location,
        city=item.city,
        state=item.state,
        pincode=item.pincode,
        freight_rate_per_ton_km=item.freight_rate_per_ton_km,
        estimated_tolls=item.estimated_tolls,
        status=item.status,
        notes=item.notes,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def list_inventory_items(
    company_id: int,
    category: str | None = None,
    search: str | None = None,
    db: Session = None,
) -> list[InventoryItemResponse]:
    query = db.query(InventoryItem).filter(InventoryItem.company_id == company_id)

    if category and category != "all":
        query = query.filter(InventoryItem.category.ilike(f"%{category}%"))

    if search:
        query = query.filter(
            or_(
                InventoryItem.material_name.ilike(f"%{search}%"),
                InventoryItem.title.ilike(f"%{search}%"),
                InventoryItem.category.ilike(f"%{search}%"),
            )
        )

    items = query.order_by(InventoryItem.created_at.desc()).all()
    return [serialize_inventory_item(item) for item in items]


def get_inventory_summary(company_id: int, db: Session) -> InventorySummaryResponse:
    items = db.query(InventoryItem).filter(InventoryItem.company_id == company_id).all()

    total_tons = 0.0
    total_val = 0.0
    low_stock = 0
    cat_breakdown: dict[str, float] = {}

    for item in items:
        total_tons += item.quantity_tons
        unit_cost = item.actual_cost_per_ton + (item.processed_cost_per_ton if item.is_processed else 0.0)
        total_val += item.quantity_tons * unit_cost
        if item.quantity_tons <= 10.0:
            low_stock += 1

        cat = item.category.lower()
        cat_breakdown[cat] = cat_breakdown.get(cat, 0.0) + item.quantity_tons

    return InventorySummaryResponse(
        total_stock_tons=round(total_tons, 2),
        total_valuation_inr=round(total_val, 2),
        item_count=len(items),
        categories_breakdown={k: round(v, 2) for k, v in cat_breakdown.items()},
        low_stock_count=low_stock,
    )


def create_inventory_item(
    company: Company,
    payload: InventoryItemCreate,
    db: Session,
) -> InventoryItemResponse:
    # If material_id is provided, resolve material name if not explicit
    mat_name = payload.material_name
    if payload.material_id:
        mat = db.query(Material).filter(Material.id == payload.material_id).first()
        if mat:
            mat_name = mat.name

    status = "in_stock"
    if payload.quantity_tons <= 0:
        status = "depleted"
    elif payload.quantity_tons <= 10:
        status = "low_stock"

    item = InventoryItem(
        company_id=company.id,
        material_id=payload.material_id,
        material_name=mat_name,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        quantity_tons=payload.quantity_tons,
        reserved_tons=0.0,
        actual_cost_per_ton=payload.actual_cost_per_ton,
        is_processed=payload.is_processed,
        processing_details=payload.processing_details if payload.is_processed else None,
        processed_cost_per_ton=payload.processed_cost_per_ton if payload.is_processed else 0.0,
        storage_location=payload.storage_location or f"{company.name} Yard",
        city=payload.city or company.city,
        state=payload.state or company.state,
        pincode=payload.pincode or company.pincode,
        freight_rate_per_ton_km=payload.freight_rate_per_ton_km,
        estimated_tolls=payload.estimated_tolls,
        status=status,
        notes=payload.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_inventory_item(item)


def update_inventory_item(
    company_id: int,
    item_id: int,
    payload: InventoryItemUpdate,
    db: Session,
) -> InventoryItemResponse:
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.company_id == company_id,
    ).first()
    if not item:
        raise ValueError("Inventory item not found.")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(item, field, val)

    # Re-evaluate stock status
    if item.quantity_tons <= 0:
        item.status = "depleted"
    elif item.quantity_tons <= 10:
        item.status = "low_stock"
    else:
        item.status = "in_stock"

    db.commit()
    db.refresh(item)
    return serialize_inventory_item(item)


def delete_inventory_item(company_id: int, item_id: int, db: Session) -> bool:
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.company_id == company_id,
    ).first()
    if not item:
        raise ValueError("Inventory item not found.")
    db.delete(item)
    db.commit()
    return True


def deduct_inventory_on_delivery(
    company_id: int,
    material_name: str,
    category: str,
    tons: float,
    db: Session,
):
    """When an order is delivered, deduct the shipped stock from the seller's inventory."""
    # Find matching inventory item
    item = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.company_id == company_id,
            or_(
                InventoryItem.material_name.ilike(material_name),
                InventoryItem.category.ilike(category),
            ),
        )
        .first()
    )
    if item:
        item.quantity_tons = max(0.0, round(item.quantity_tons - tons, 2))
        if item.quantity_tons <= 0:
            item.status = "depleted"
        elif item.quantity_tons <= 10:
            item.status = "low_stock"
        db.commit()


def credit_inventory_on_delivery(
    buyer_company: Company,
    material_name: str,
    category: str,
    tons: float,
    cost_per_ton: float,
    is_processed: bool,
    processed_cost: float,
    db: Session,
):
    """When an order is delivered, add the received stock into the buyer's inventory."""
    item = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.company_id == buyer_company.id,
            InventoryItem.material_name.ilike(material_name),
        )
        .first()
    )
    if item:
        # Update existing stock
        item.quantity_tons = round(item.quantity_tons + tons, 2)
        item.status = "in_stock"
    else:
        # Create new inventory entry in buyer's warehouse
        item = InventoryItem(
            company_id=buyer_company.id,
            material_name=material_name,
            category=category,
            title=f"Procured {material_name}",
            description=f"Secondary raw material acquired through Scrappy Exchange.",
            quantity_tons=tons,
            reserved_tons=0.0,
            actual_cost_per_ton=cost_per_ton,
            is_processed=is_processed,
            processed_cost_per_ton=processed_cost,
            storage_location=f"{buyer_company.name} Inbound Bay",
            city=buyer_company.city,
            state=buyer_company.state,
            pincode=buyer_company.pincode,
            status="in_stock",
            notes="Added automatically from delivered trade.",
        )
        db.add(item)
    db.commit()
