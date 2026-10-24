"""
Admin router — company verification, material CRUD, and material-request
management. All endpoints require the 'admin' role.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User
from app.schemas.company import CompanyAdminResponse, VerificationAction
from app.schemas.material import (
    MaterialCreate,
    MaterialRequestAction,
    MaterialRequestResponse,
    MaterialResponse,
    MaterialUpdate,
)
from app.services import company_service, material_service
from app.utils.file_storage import decrypt_and_read

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Company verification ────────────────────────────────────────────────


@router.get(
    "/companies",
    response_model=list[CompanyAdminResponse],
    summary="List companies (admin)",
)
def list_companies(
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all companies, optionally filtered by verification status.

    Query params:
    - **status_filter**: pending, verified, rejected, suspended
    - **skip / limit**: pagination
    """
    return company_service.list_companies(db, status_filter=status_filter, skip=skip, limit=limit)


@router.get(
    "/companies/{company_id}",
    response_model=CompanyAdminResponse,
    summary="Get company detail (admin)",
)
def get_company(
    company_id: int,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Return full details of a specific company, including admin-only fields."""
    try:
        return company_service.get_company_by_id(company_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/companies/{company_id}/license",
    summary="Download company license (admin)",
)
def download_company_license(
    company_id: int,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Download a company's license document (decrypted)."""
    try:
        company = company_service.get_company_by_id(company_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    if not company.license_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No license file uploaded for this company",
        )

    try:
        decrypted = decrypt_and_read(company.license_file_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License file not found on disk",
        )

    return Response(
        content=decrypted,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=company_{company_id}_license.pdf"},
    )


@router.put(
    "/companies/{company_id}/verify",
    response_model=CompanyAdminResponse,
    summary="Verify / reject / suspend a company",
)
def verify_company(
    company_id: int,
    action: VerificationAction,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Set a company's verification status and optional admin notes."""
    try:
        return company_service.verify_company(company_id, action, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ── Material CRUD ───────────────────────────────────────────────────────


@router.post(
    "/materials",
    response_model=MaterialResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a catalog material (admin)",
)
def create_material(
    payload: MaterialCreate,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Add a new material to the catalog."""
    try:
        return material_service.create_material(payload, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.put(
    "/materials/{material_id}",
    response_model=MaterialResponse,
    summary="Update a catalog material (admin)",
)
def update_material(
    material_id: int,
    payload: MaterialUpdate,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Update an existing material in the catalog."""
    try:
        return material_service.update_material(material_id, payload, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete(
    "/materials/{material_id}",
    response_model=MaterialResponse,
    summary="Soft-delete a catalog material (admin)",
)
def delete_material(
    material_id: int,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Soft-delete a material (sets is_active = False)."""
    try:
        return material_service.soft_delete_material(material_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ── Material request management ─────────────────────────────────────────


@router.get(
    "/material-requests",
    response_model=list[MaterialRequestResponse],
    summary="List material requests (admin)",
)
def list_material_requests(
    status_filter: str | None = None,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all material requests, optionally filtered by status."""
    return material_service.list_material_requests(db, status_filter=status_filter)


@router.put(
    "/material-requests/{request_id}",
    response_model=MaterialRequestResponse,
    summary="Approve or reject a material request (admin)",
)
def action_material_request(
    request_id: int,
    action: MaterialRequestAction,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Approve or reject a pending material request.

    Approved requests automatically create the material in the catalog.
    """
    try:
        return material_service.action_material_request(request_id, action, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
