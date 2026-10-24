"""
Quality router — Material quality testing requirements, certificate submission,
encrypted document download, and administrative review workflow.
"""

import json
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role, require_verified_company, require_active_subscription
from app.models.listing import Listing
from app.models.order import Order
from app.models.quality import (
    MaterialQualityRequirement,
    QualityReviewLog,
    QualityTestCertificate,
)
from app.models.trade import TradeHistory
from app.models.user import User
from app.schemas.quality import (
    QualityCertificateResponse,
    QualityRequirementCreate,
    QualityRequirementResponse,
    QualityReviewAction,
    QualityReviewLogResponse,
)
from app.services import quality_service
from app.utils.file_storage import decrypt_and_read

router = APIRouter(prefix="/quality", tags=["Quality Certification"])


@router.get("/requirements", response_model=list[QualityRequirementResponse])
def get_quality_requirements(
    material_id: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
):
    """Retrieve testing requirements for a specific material or category."""
    reqs = quality_service.get_requirements(material_id, category, db)
    return [
        QualityRequirementResponse(
            id=r.id,
            material_id=r.material_id,
            material_category=r.material_category,
            test_name=r.test_name,
            parameter_key=r.parameter_key,
            parameter_label=r.parameter_label,
            parameter_unit=r.parameter_unit,
            data_type=r.data_type,
            is_mandatory=r.is_mandatory,
            min_value=r.min_value,
            max_value=r.max_value,
            standard_code=r.standard_code,
            description=r.description,
        )
        for r in reqs
    ]


@router.post("/requirements", response_model=QualityRequirementResponse, status_code=status.HTTP_201_CREATED)
def create_quality_requirement(
    payload: QualityRequirementCreate,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin endpoint to create a material quality testing requirement."""
    req = MaterialQualityRequirement(**payload.model_dump())
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.delete("/requirements/{requirement_id}", status_code=status.HTTP_200_OK)
def delete_quality_requirement(
    requirement_id: int,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin endpoint to deactivate a quality requirement."""
    req = db.query(MaterialQualityRequirement).filter(MaterialQualityRequirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found.")
    req.is_active = False
    db.commit()
    return {"message": "Requirement deactivated."}


@router.post("/listings/{listing_id}/certificate", response_model=QualityCertificateResponse)
async def upload_listing_certificate(
    listing_id: int,
    file: UploadFile = File(...),
    metadata: str | None = Form(None, description="JSON string containing testing lab, cert number, test date, and parameters"),
    test_name: str | None = Form(None),
    testing_lab_name: str | None = Form(None),
    certificate_number: str | None = Form(None),
    test_date: str | None = Form(None),
    expiry_date: str | None = Form(None),
    lab_accreditation: str | None = Form(None),
    overall_grade_or_result: str | None = Form(None),
    measured_parameters: str | None = Form(None),
    current_user: User = Depends(require_active_subscription()),
    db: Session = Depends(get_db),
):
    """Upload material quality test certificate document and measured parameters for a listing."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")

    if current_user.role != "admin" and listing.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You do not own this listing.")

    cert_data = {}
    if metadata:
        try:
            cert_data = json.loads(metadata)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON metadata.")

    if testing_lab_name:
        cert_data["testing_lab_name"] = testing_lab_name
    if certificate_number:
        cert_data["certificate_number"] = certificate_number
    if test_date:
        cert_data["test_date"] = test_date
    if test_name:
        cert_data["test_name"] = test_name
    if expiry_date:
        cert_data["expiry_date"] = expiry_date
    if lab_accreditation:
        cert_data["lab_accreditation"] = lab_accreditation
    if overall_grade_or_result:
        cert_data["overall_grade_or_result"] = overall_grade_or_result
    if measured_parameters:
        try:
            cert_data["parameters_data"] = json.loads(measured_parameters)
        except Exception:
            cert_data["parameters_data"] = {}

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    try:
        cert = quality_service.attach_quality_certificate(
            listing=listing,
            cert_data=cert_data,
            file_bytes=file_bytes,
            filename=file.filename or "quality_test_certificate.pdf",
            user=current_user,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    params_parsed = json.loads(cert.parameters_data) if cert.parameters_data else {}
    return QualityCertificateResponse(
        id=cert.id,
        listing_id=cert.listing_id,
        company_id=cert.company_id,
        material_id=cert.material_id,
        material_category=cert.material_category,
        material_grade=cert.material_grade,
        test_name=cert.test_name,
        testing_lab_name=cert.testing_lab_name,
        lab_accreditation=cert.lab_accreditation,
        certificate_number=cert.certificate_number,
        test_date=cert.test_date,
        valid_until=cert.valid_until,
        parameters_data=params_parsed,
        test_result_summary=cert.test_result_summary,
        original_filename=cert.original_filename,
        file_size_bytes=cert.file_size_bytes,
        mime_type=cert.mime_type,
        review_status=cert.review_status,
        reviewed_at=cert.reviewed_at,
        reviewer_comments=cert.reviewer_comments,
        created_at=cert.created_at,
    )


@router.get("/listings/{listing_id}/certificate", response_model=QualityCertificateResponse)
def get_listing_certificate(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve quality test certificate details for a listing."""
    cert = db.query(QualityTestCertificate).filter(QualityTestCertificate.listing_id == listing_id).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No certificate found for this listing.")

    # Access control: listing owner, admins, or buyers checking verified listing
    if current_user.role != "admin" and cert.company_id != current_user.company_id:
        # Check if buyer has permission to view (e.g. browsing marketplace or placed order)
        if cert.review_status != "approved":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to pending or rejected certificate.")

    params_parsed = json.loads(cert.parameters_data) if cert.parameters_data else {}
    return QualityCertificateResponse(
        id=cert.id,
        listing_id=cert.listing_id,
        company_id=cert.company_id,
        material_id=cert.material_id,
        material_category=cert.material_category,
        material_grade=cert.material_grade,
        test_name=cert.test_name,
        testing_lab_name=cert.testing_lab_name,
        lab_accreditation=cert.lab_accreditation,
        certificate_number=cert.certificate_number,
        test_date=cert.test_date,
        valid_until=cert.valid_until,
        parameters_data=params_parsed,
        test_result_summary=cert.test_result_summary,
        original_filename=cert.original_filename,
        file_size_bytes=cert.file_size_bytes,
        mime_type=cert.mime_type,
        review_status=cert.review_status,
        reviewed_at=cert.reviewed_at,
        reviewer_comments=cert.reviewer_comments,
        created_at=cert.created_at,
    )


@router.get("/certificates/{certificate_id}/download")
def download_certificate_document(
    certificate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Secure decrypted download of the quality certificate document."""
    cert = db.query(QualityTestCertificate).filter(QualityTestCertificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate record not found.")

    # Authorization check
    is_owner = current_user.company_id == cert.company_id
    is_admin = current_user.role == "admin"
    is_verified_buyer = False

    if not is_owner and not is_admin:
        # Check if caller has an order or trade with this listing
        if current_user.company_id:
            order_exists = db.query(Order).filter(
                Order.listing_id == cert.listing_id,
                Order.buyer_company_id == current_user.company_id,
            ).first()
            if order_exists or cert.review_status == "approved":
                is_verified_buyer = True

    if not (is_owner or is_admin or is_verified_buyer):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to download this private document.")

    try:
        decrypted_bytes = decrypt_and_read(cert.file_path)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate file not found on disk.")
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Decryption failed.")

    safe_filename = f"cert_{cert.certificate_number.replace('/', '_')}_{cert.original_filename}"
    return Response(
        content=decrypted_bytes,
        media_type=cert.mime_type or "application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )


@router.get("/review-queue", response_model=list[QualityCertificateResponse])
def get_review_queue(
    status_filter: str | None = None,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list submitted test certificates in review queue."""
    query = db.query(QualityTestCertificate)
    if status_filter and status_filter != "all":
        query = query.filter(QualityTestCertificate.review_status == status_filter)
    certs = query.order_by(QualityTestCertificate.created_at.desc()).all()

    return [
        QualityCertificateResponse(
            id=c.id,
            listing_id=c.listing_id,
            company_id=c.company_id,
            material_id=c.material_id,
            material_category=c.material_category,
            material_grade=c.material_grade,
            test_name=c.test_name,
            testing_lab_name=c.testing_lab_name,
            lab_accreditation=c.lab_accreditation,
            certificate_number=c.certificate_number,
            test_date=c.test_date,
            valid_until=c.valid_until,
            parameters_data=json.loads(c.parameters_data) if c.parameters_data else {},
            test_result_summary=c.test_result_summary,
            original_filename=c.original_filename,
            file_size_bytes=c.file_size_bytes,
            mime_type=c.mime_type,
            review_status=c.review_status,
            reviewed_at=c.reviewed_at,
            reviewer_comments=c.reviewer_comments,
            created_at=c.created_at,
        )
        for c in certs
    ]


@router.put("/certificates/{certificate_id}/review", response_model=QualityCertificateResponse)
def review_certificate(
    certificate_id: int,
    payload: QualityReviewAction,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin endpoint to approve, reject, or request information on a certificate."""
    try:
        cert = quality_service.review_quality_certificate(
            certificate_id=certificate_id,
            action=payload.action,
            reviewer=admin,
            comments=payload.comments,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return QualityCertificateResponse(
        id=cert.id,
        listing_id=cert.listing_id,
        company_id=cert.company_id,
        material_id=cert.material_id,
        material_category=cert.material_category,
        material_grade=cert.material_grade,
        test_name=cert.test_name,
        testing_lab_name=cert.testing_lab_name,
        lab_accreditation=cert.lab_accreditation,
        certificate_number=cert.certificate_number,
        test_date=cert.test_date,
        valid_until=cert.valid_until,
        parameters_data=json.loads(cert.parameters_data) if cert.parameters_data else {},
        test_result_summary=cert.test_result_summary,
        original_filename=cert.original_filename,
        file_size_bytes=cert.file_size_bytes,
        mime_type=cert.mime_type,
        review_status=cert.review_status,
        reviewed_at=cert.reviewed_at,
        reviewer_comments=cert.reviewer_comments,
        created_at=cert.created_at,
    )


@router.get("/certificates/{certificate_id}/audit-logs", response_model=list[QualityReviewLogResponse])
def get_certificate_audit_logs(
    certificate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the audit trail of status changes for a quality certificate."""
    cert = db.query(QualityTestCertificate).filter(QualityTestCertificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found.")

    if current_user.role != "admin" and cert.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    logs = (
        db.query(QualityReviewLog)
        .filter(QualityReviewLog.certificate_id == certificate_id)
        .order_by(QualityReviewLog.created_at.desc())
        .all()
    )

    return [
        QualityReviewLogResponse(
            id=log.id,
            certificate_id=log.certificate_id,
            performed_by=log.performed_by,
            reviewer_name=log.user.full_name if log.user else "System",
            action=log.action,
            previous_status=log.previous_status,
            new_status=log.new_status,
            comments=log.comments,
            created_at=log.created_at,
        )
        for log in logs
    ]
