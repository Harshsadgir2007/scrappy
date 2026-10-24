"""
Company management router — profile, license upload/download.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.company import CompanyResponse, CompanyUpdate
from app.services import company_service
from app.utils.file_storage import decrypt_and_read, encrypt_and_save

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get(
    "/me",
    response_model=CompanyResponse,
    summary="Get own company profile",
)
def get_my_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the company profile of the authenticated user."""
    try:
        company = company_service.get_user_company(current_user, db)
        return company
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put(
    "/me",
    response_model=CompanyResponse,
    summary="Update own company profile",
)
def update_my_company(
    payload: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's company profile.

    If the company was previously verified, updating it resets the
    verification status to 'pending' for admin re-review.
    """
    try:
        company = company_service.update_company(current_user, payload, db)
        return company
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/me/license",
    status_code=status.HTTP_201_CREATED,
    summary="Upload company license (PDF, max 10 MB)",
)
def upload_license(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a license document (PDF only, encrypted at rest)."""
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted",
        )

    # Read and validate size
    file_bytes = file.file.read()
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 10 MB limit",
        )

    try:
        company = company_service.get_user_company(current_user, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    # Encrypt and save
    stored_path = encrypt_and_save(file_bytes, file.filename or "license.pdf")
    company_service.set_license_path(company, stored_path, db)

    return {
        "message": "License uploaded successfully and verified!",
        "path": stored_path,
        "verification_status": "verified"
    }


@router.get(
    "/me/license",
    summary="Download own company license",
)
def download_license(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download the authenticated user's company license (decrypted)."""
    try:
        company = company_service.get_user_company(current_user, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    if not company.license_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No license file uploaded",
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
        headers={"Content-Disposition": "attachment; filename=license.pdf"},
    )
