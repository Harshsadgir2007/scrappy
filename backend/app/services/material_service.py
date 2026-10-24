"""
Material service — business logic for the material catalog and
material request workflows.
"""

import json

from sqlalchemy.orm import Session

from app.models.material import Material, MaterialRequest
from app.schemas.material import (
    MaterialCreate,
    MaterialRequestAction,
    MaterialRequestCreate,
    MaterialUpdate,
)


# ── Catalog operations ──────────────────────────────────────────────────


def list_materials(db: Session, active_only: bool = True) -> list[Material]:
    """Return all materials from the catalog.

    Args:
        db: Active database session.
        active_only: If True (default), only return active materials.

    Returns:
        List of Material instances.
    """
    query = db.query(Material)
    if active_only:
        query = query.filter(Material.is_active == True)  # noqa: E712
    return query.order_by(Material.name).all()


def get_material(material_id: int, db: Session) -> Material:
    """Fetch a single material by ID.

    Args:
        material_id: Primary key.
        db: Active database session.

    Returns:
        The Material instance.

    Raises:
        ValueError: If not found or inactive.
    """
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise ValueError("Material not found")
    return material


def create_material(payload: MaterialCreate, db: Session) -> Material:
    """Add a new material to the catalog (admin only).

    Args:
        payload: Validated material data.
        db: Active database session.

    Returns:
        The newly created Material.

    Raises:
        ValueError: If a material with the same name already exists.
    """
    existing = db.query(Material).filter(Material.name == payload.name).first()
    if existing:
        raise ValueError(f"Material '{payload.name}' already exists")

    material = Material(
        name=payload.name,
        category=payload.category,
        description=payload.description,
        hazard_class=payload.hazard_class,
        compatible_industries=json.dumps(payload.compatible_industries),
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


def update_material(
    material_id: int,
    payload: MaterialUpdate,
    db: Session,
) -> Material:
    """Update an existing catalog material (admin only).

    Args:
        material_id: The material to update.
        payload: Partial update data.
        db: Active database session.

    Returns:
        The updated Material.

    Raises:
        ValueError: If the material is not found.
    """
    material = get_material(material_id, db)

    update_data = payload.model_dump(exclude_unset=True)

    # Serialize compatible_industries list to JSON string
    if "compatible_industries" in update_data and update_data["compatible_industries"] is not None:
        update_data["compatible_industries"] = json.dumps(update_data["compatible_industries"])

    for field, value in update_data.items():
        setattr(material, field, value)

    db.commit()
    db.refresh(material)
    return material


def soft_delete_material(material_id: int, db: Session) -> Material:
    """Soft-delete a material by setting is_active to False.

    Args:
        material_id: The material to deactivate.
        db: Active database session.

    Returns:
        The updated Material.

    Raises:
        ValueError: If the material is not found.
    """
    material = get_material(material_id, db)
    material.is_active = False
    db.commit()
    db.refresh(material)
    return material


# ── Material request operations ─────────────────────────────────────────


def create_material_request(
    user_id: int,
    payload: MaterialRequestCreate,
    db: Session,
) -> MaterialRequest:
    """Submit a request for a new material type.

    Args:
        user_id: The requesting user's ID.
        payload: Request data.
        db: Active database session.

    Returns:
        The created MaterialRequest.
    """
    req = MaterialRequest(
        requested_by=user_id,
        name=payload.name,
        category=payload.category,
        description=payload.description,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def list_material_requests(
    db: Session,
    status_filter: str | None = None,
) -> list[MaterialRequest]:
    """List material requests with optional status filtering.

    Args:
        db: Active database session.
        status_filter: If provided, only return requests with this status.

    Returns:
        List of MaterialRequest instances.
    """
    query = db.query(MaterialRequest)
    if status_filter:
        query = query.filter(MaterialRequest.status == status_filter)
    return query.order_by(MaterialRequest.created_at.desc()).all()


def action_material_request(
    request_id: int,
    action: MaterialRequestAction,
    db: Session,
) -> MaterialRequest:
    """Approve or reject a material request (admin only).

    If approved, automatically creates the material in the catalog.

    Args:
        request_id: The request to act upon.
        action: Admin's decision.
        db: Active database session.

    Returns:
        The updated MaterialRequest.

    Raises:
        ValueError: If the request is not found or already processed.
    """
    req = db.query(MaterialRequest).filter(MaterialRequest.id == request_id).first()
    if not req:
        raise ValueError("Material request not found")

    if req.status != "pending":
        raise ValueError(f"Request already processed (status: {req.status})")

    req.status = action.status
    req.admin_notes = action.admin_notes

    # If approved, create the material in the catalog
    if action.status == "approved":
        existing = db.query(Material).filter(Material.name == req.name).first()
        if not existing:
            material = Material(
                name=req.name,
                category=req.category or "other",
                description=req.description,
            )
            db.add(material)

    db.commit()
    db.refresh(req)
    return req
