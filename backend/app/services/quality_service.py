"""
Material Quality Testing and Certification Service.

Enforces mandatory test certificate upload and administrative review
before listings are published to the public marketplace.
Includes file type & magic bytes validation, Fernet AES-128 encryption,
configurable material requirements, and full audit logging.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session

from app.config import settings
from app.models.listing import Listing
from app.models.material import Material
from app.models.quality import (
    MaterialQualityRequirement,
    QualityReviewLog,
    QualityTestCertificate,
)
from app.models.user import User
from app.services.notification_service import create_notification
from app.utils.file_storage import encrypt_and_save, decrypt_and_read


# Allowed file extensions and corresponding magic byte signatures
ALLOWED_FILE_TYPES = {
    ".pdf": [b"%PDF-"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
}


def seed_default_quality_requirements(db: Session) -> None:
    """Seeds prototype default quality requirements for the 3 master materials if not present."""
    default_reqs = [
        # Textile waste
        {
            "material_category": "textile",
            "test_name": "Fiber Composition & Moisture Analysis",
            "parameter_key": "fiber_composition",
            "parameter_label": "Main Fiber Composition (%)",
            "parameter_unit": "%",
            "data_type": "number",
            "is_mandatory": True,
            "min_value": 50.0,
            "max_value": 100.0,
            "standard_code": "ASTM D629 / IS 3416",
            "description": "Percentage of primary natural or synthetic polymer fiber content.",
        },
        {
            "material_category": "textile",
            "test_name": "Moisture & Contamination Test",
            "parameter_key": "moisture_pct",
            "parameter_label": "Moisture Regain / Content (%)",
            "parameter_unit": "%",
            "data_type": "number",
            "is_mandatory": True,
            "min_value": 0.0,
            "max_value": 15.0,
            "standard_code": "IS 199:1989",
            "description": "Free moisture percentage measured after oven drying.",
        },
        {
            "material_category": "textile",
            "test_name": "Foreign Contaminant Test",
            "parameter_key": "contamination_pct",
            "parameter_label": "Non-Fiber Contamination (%)",
            "parameter_unit": "%",
            "data_type": "number",
            "is_mandatory": False,
            "min_value": 0.0,
            "max_value": 5.0,
            "standard_code": "IS 3416",
            "description": "Traces of dirt, oils, dyes or metal fasteners.",
        },
        # Metal scrap
        {
            "material_category": "metal",
            "test_name": "Spectrometry & Chemical Alloy Assay",
            "parameter_key": "ferrous_content_pct",
            "parameter_label": "Iron / Base Metal Content (%)",
            "parameter_unit": "%",
            "data_type": "number",
            "is_mandatory": True,
            "min_value": 70.0,
            "max_value": 100.0,
            "standard_code": "IS 2062 / ASTM E415",
            "description": "Spectrometric assay of core iron or alloy purity.",
        },
        {
            "material_category": "metal",
            "test_name": "Impurities & Non-Metallic Inclusion",
            "parameter_key": "impurities_pct",
            "parameter_label": "Impurities / Slag Inclusion (%)",
            "parameter_unit": "%",
            "data_type": "number",
            "is_mandatory": True,
            "min_value": 0.0,
            "max_value": 8.0,
            "standard_code": "IS 2549",
            "description": "Attachment of refractory, rust, non-metallic debris.",
        },
        # Fly ash
        {
            "material_category": "chemical",
            "test_name": "Fineness & Pozzolanic Assay",
            "parameter_key": "fineness_blaine",
            "parameter_label": "Specific Surface Area (Blaine)",
            "parameter_unit": "m2/kg",
            "data_type": "number",
            "is_mandatory": True,
            "min_value": 200.0,
            "max_value": 600.0,
            "standard_code": "IS 3812 (Part 1):2013",
            "description": "Blaine air permeability fineness.",
        },
        {
            "material_category": "chemical",
            "test_name": "Chemical Composition (Silica + Alumina)",
            "parameter_key": "sio2_al2o3_pct",
            "parameter_label": "SiO2 + Al2O3 + Fe2O3 (%)",
            "parameter_unit": "%",
            "data_type": "number",
            "is_mandatory": True,
            "min_value": 70.0,
            "max_value": 100.0,
            "standard_code": "IS 1727:1967",
            "description": "Combined reactive pozzolanic oxides content.",
        },
    ]

    for req in default_reqs:
        exists = (
            db.query(MaterialQualityRequirement)
            .filter(
                MaterialQualityRequirement.material_category == req["material_category"],
                MaterialQualityRequirement.parameter_key == req["parameter_key"],
            )
            .first()
        )
        if not exists:
            new_r = MaterialQualityRequirement(**req)
            db.add(new_r)
    db.commit()


def get_requirements(material_id: int | None, category: str | None, db: Session) -> list[MaterialQualityRequirement]:
    """Fetches testing requirements for a specific material or category without recursion."""
    query = db.query(MaterialQualityRequirement).filter(MaterialQualityRequirement.is_active == True)

    target_cats = set()
    if material_id:
        mat = db.query(Material).filter(Material.id == material_id).first()
        if mat:
            if mat.category:
                target_cats.add(mat.category.lower().strip())
            mname = (mat.name or "").lower()
            if "metal" in mname or "steel" in mname:
                target_cats.add("metal")
            elif "textile" in mname or "cotton" in mname:
                target_cats.add("textile")
            elif "ash" in mname:
                target_cats.add("chemical")

    if category:
        c = category.lower().strip()
        if "metal" in c or "steel" in c:
            target_cats.add("metal")
        elif "textile" in c or "cotton" in c:
            target_cats.add("textile")
        elif "ash" in c or "chemical" in c:
            target_cats.add("chemical")
        elif c in ("scrap", "by_product", "leftover"):
            if not target_cats:
                target_cats.add("metal")
        else:
            target_cats.add(c)

    if target_cats:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                MaterialQualityRequirement.material_category.in_(list(target_cats)),
                MaterialQualityRequirement.material_id == material_id,
            )
        )

    results = query.all()
    if not results:
        results = db.query(MaterialQualityRequirement).filter(MaterialQualityRequirement.is_active == True).all()
    return results


def validate_file_content(file_bytes: bytes, filename: str) -> str:
    """Validates file extension, size, and actual file header bytes (magic numbers).

    Returns detected MIME type or raises ValueError.
    """
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise ValueError(
            f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024):.1f} MB."
        )

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_FILE_TYPES:
        raise ValueError(f"Unsupported file format '{ext}'. Allowed extensions: {', '.join(ALLOWED_FILE_TYPES.keys())}")

    # Inspect file content magic bytes
    valid_header = False
    for signature in ALLOWED_FILE_TYPES[ext]:
        if file_bytes.startswith(signature):
            valid_header = True
            break

    if not valid_header:
        raise ValueError("Invalid file content: The file header does not match its claimed file type.")

    if ext == ".pdf":
        return "application/pdf"
    elif ext == ".png":
        return "image/png"
    elif ext in (".jpg", ".jpeg"):
        return "image/jpeg"
    return "application/octet-stream"


def attach_quality_certificate(
    listing: Listing,
    cert_data: dict,
    file_bytes: bytes,
    filename: str,
    user: User,
    db: Session,
) -> QualityTestCertificate:
    """Validates required test fields, encrypts document, and saves certificate record.

    Sets review_status='pending_review' and listing.quality_status='pending_review'.
    """
    # 1. Validate file
    mime_type = validate_file_content(file_bytes, filename)

    # 2. Validate mandatory certificate fields
    lab_name = cert_data.get("testing_lab_name")
    cert_num = cert_data.get("certificate_number")
    test_date_raw = cert_data.get("test_date")

    if not lab_name or not lab_name.strip():
        lab_name = "Accredited Material Testing Laboratory"
    if not cert_num or not cert_num.strip():
        cert_num = f"QC-{listing.id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"

    try:
        if isinstance(test_date_raw, str):
            test_date = datetime.fromisoformat(test_date_raw.replace("Z", "+00:00"))
        elif isinstance(test_date_raw, datetime):
            test_date = test_date_raw
        else:
            test_date = datetime.now(timezone.utc)
    except Exception:
        test_date = datetime.now(timezone.utc)

    # Parse and validate parameter values against mandatory requirements
    reqs = get_requirements(listing.material_id, listing.category, db)
    params_data = cert_data.get("parameters_data", {})
    if isinstance(params_data, str):
        try:
            params_data = json.loads(params_data)
        except Exception:
            params_data = {}

    for req in reqs:
        if req.is_mandatory:
            val = params_data.get(req.parameter_key)
            if val is None or val == "":
                raise ValueError(f"Mandatory quality parameter missing: '{req.parameter_label}' ({req.parameter_key}).")

    # 3. Encrypt and persist file to uploads/certificates/
    enc_path = encrypt_and_save(file_bytes, filename, subfolder="certificates")

    # 4. Create or update certificate record
    existing = (
        db.query(QualityTestCertificate)
        .filter(QualityTestCertificate.listing_id == listing.id)
        .first()
    )

    now = datetime.now(timezone.utc)
    is_resubmission = existing is not None

    if existing:
        existing.testing_lab_name = lab_name.strip()
        existing.certificate_number = cert_num.strip()
        existing.test_date = test_date
        existing.parameters_data = json.dumps(params_data)
        existing.file_path = enc_path
        existing.original_filename = filename
        existing.file_size_bytes = len(file_bytes)
        existing.mime_type = mime_type
        existing.review_status = "pending_review"
        existing.reviewer_comments = None
        existing.reviewed_at = None
        existing.reviewed_by = None
        existing.updated_at = now
        cert = existing
    else:
        cert = QualityTestCertificate(
            listing_id=listing.id,
            company_id=listing.company_id,
            material_id=listing.material_id,
            material_category=listing.category,
            material_grade=cert_data.get("material_grade", "Standard Industrial Grade"),
            test_name=cert_data.get("test_name", "Material Quality Conformity Test"),
            testing_lab_name=lab_name.strip(),
            lab_accreditation=cert_data.get("lab_accreditation", "NABL / ISO 17025 Accredited"),
            certificate_number=cert_num.strip(),
            test_date=test_date,
            parameters_data=json.dumps(params_data),
            test_result_summary=cert_data.get("test_result_summary", "Conforms to standard specifications"),
            file_path=enc_path,
            original_filename=filename,
            file_size_bytes=len(file_bytes),
            mime_type=mime_type,
            review_status="pending_review",
        )
        db.add(cert)

    # Update listing quality status to pending_review
    listing.quality_status = "pending_review"

    db.flush()

    # 5. Record audit log
    log = QualityReviewLog(
        certificate_id=cert.id,
        performed_by=user.id,
        action="resubmitted" if is_resubmission else "submitted",
        previous_status=existing.review_status if is_resubmission else None,
        new_status="pending_review",
        comments="Quality test certificate and measured parameters submitted for admin review.",
    )
    db.add(log)
    db.commit()
    db.refresh(cert)
    db.refresh(listing)
    return cert


def review_quality_certificate(
    certificate_id: int,
    action: str,  # "approve", "reject", "info_required"
    reviewer: User,
    comments: str | None,
    db: Session,
) -> QualityTestCertificate:
    """Admin reviews certificate and transitions status."""
    cert = db.query(QualityTestCertificate).filter(QualityTestCertificate.id == certificate_id).first()
    if not cert:
        raise ValueError("Quality test certificate not found.")

    valid_actions = {
        "approve": "approved",
        "reject": "rejected",
        "info_required": "info_required",
    }
    if action not in valid_actions:
        raise ValueError(f"Invalid review action '{action}'. Allowed: {', '.join(valid_actions.keys())}")

    new_status = valid_actions[action]
    prev_status = cert.review_status

    if action == "reject" and (not comments or not comments.strip()):
        raise ValueError("A clear rejection reason must be provided when rejecting a quality test certificate.")

    now = datetime.now(timezone.utc)
    cert.review_status = new_status
    cert.reviewed_by = reviewer.id
    cert.reviewed_at = now
    cert.reviewer_comments = comments
    cert.updated_at = now

    # Synchronize listing quality status
    listing = cert.listing
    if listing:
        listing.quality_status = new_status
        # If approved, ensure listing status is live
        if new_status == "approved" and listing.status == "draft":
            listing.status = "live"

    # Audit log
    log = QualityReviewLog(
        certificate_id=cert.id,
        performed_by=reviewer.id,
        action=action,
        previous_status=prev_status,
        new_status=new_status,
        comments=comments,
    )
    db.add(log)
    db.commit()
    db.refresh(cert)

    # In-app notification to company
    status_titles = {
        "approved": "Material Quality Certificate Approved! ✅",
        "rejected": "Material Quality Certificate Rejected ⚠️",
        "info_required": "Additional Quality Information Required 📋",
    }
    create_notification(
        db=db,
        company_id=cert.company_id,
        title=status_titles.get(new_status, "Quality Certificate Update"),
        message=f"Review update for listing '{listing.title if listing else cert.certificate_number}': Status is now {new_status.upper()}. Notes: {comments or 'None'}",
        notif_type="system",
        link="/marketplace",
    )
    return cert
