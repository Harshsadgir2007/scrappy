"""
Material catalog router — list materials and request new ones.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.material import (
    MaterialRequestCreate,
    MaterialRequestResponse,
    MaterialResponse,
)
from app.services import material_service

router = APIRouter(prefix="/materials", tags=["Materials"])


@router.get(
    "",
    response_model=list[MaterialResponse],
    summary="List all active materials",
)
def list_materials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all active materials in the catalog.

    Available to any authenticated user.
    """
    return material_service.list_materials(db)


@router.get(
    "/{material_id}",
    response_model=MaterialResponse,
    summary="Get a single material",
)
def get_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return details of a specific catalog material."""
    try:
        return material_service.get_material(material_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/request",
    response_model=MaterialRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request a new material type",
)
def request_material(
    payload: MaterialRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a request to add a new material type to the catalog.

    Primarily intended for sellers who need to list a waste/by-product
    that doesn't yet exist in the catalog.
    """
    return material_service.create_material_request(current_user.id, payload, db)
