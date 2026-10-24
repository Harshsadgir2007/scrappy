"""
Material Quality Test Requirements and Test Certificate ORM models.

Enforces mandatory quality testing and certification before material listings
can be published. Supports configurable testing requirements per material category,
Fernet AES-128 encrypted certificate storage, and an administrative review workflow
(pending_review, approved, rejected, info_required) with full audit logging.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class MaterialQualityRequirement(Base):
    """Admin-configurable testing requirements by material or category."""

    __tablename__ = "material_quality_requirements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), nullable=True, index=True)
    material_category = Column(String(64), nullable=True, index=True)  # metal, textile, chemical, etc.

    test_name = Column(String(255), nullable=False)
    parameter_key = Column(String(64), nullable=False)
    parameter_label = Column(String(255), nullable=False)
    parameter_unit = Column(String(32), nullable=True)
    data_type = Column(String(32), nullable=False, default="number")  # number, text, range, boolean

    is_mandatory = Column(Boolean, nullable=False, default=True)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    standard_code = Column(String(64), nullable=True)  # e.g., IS 2062, ASTM D629, IS 3812
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime,
        nullable=True,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    material = relationship("Material", lazy="joined")

    def __repr__(self) -> str:
        return f"<MaterialQualityRequirement id={self.id} param={self.parameter_key} cat={self.material_category}>"


class QualityTestCertificate(Base):
    """Uploaded quality test certificate and measured parameters for a listing."""

    __tablename__ = "quality_test_certificates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)

    material_category = Column(String(64), nullable=False)
    material_grade = Column(String(128), nullable=True)

    test_name = Column(String(255), nullable=False)
    testing_lab_name = Column(String(255), nullable=False)
    lab_accreditation = Column(String(128), nullable=True)  # e.g. NABL Accredited / ISO 17025
    certificate_number = Column(String(128), nullable=False, index=True)

    test_date = Column(DateTime, nullable=False)
    valid_until = Column(DateTime, nullable=True)

    # JSON map of measured values and parameters
    parameters_data = Column(Text, nullable=False)
    test_result_summary = Column(Text, nullable=True)

    # Encrypted document path
    file_path = Column(String(512), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(64), nullable=False)

    # Status: 'draft', 'pending_review', 'approved', 'rejected', 'info_required'
    review_status = Column(String(32), nullable=False, default="pending_review", index=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_comments = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime,
        nullable=True,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    listing = relationship("Listing", back_populates="quality_certificate", lazy="joined")
    company = relationship("Company", lazy="joined")
    material = relationship("Material", lazy="joined")
    reviewer = relationship("User", foreign_keys=[reviewed_by], lazy="joined")
    audit_logs = relationship("QualityReviewLog", back_populates="certificate", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<QualityTestCertificate id={self.id} listing_id={self.listing_id} cert={self.certificate_number} status={self.review_status}>"


class QualityReviewLog(Base):
    """Audit trail of certificate reviews, submissions, and status changes."""

    __tablename__ = "quality_review_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    certificate_id = Column(Integer, ForeignKey("quality_test_certificates.id", ondelete="CASCADE"), nullable=False, index=True)
    performed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Action: 'submitted', 'approved', 'rejected', 'info_requested', 'resubmitted', 'file_replaced'
    action = Column(String(32), nullable=False)
    previous_status = Column(String(32), nullable=True)
    new_status = Column(String(32), nullable=False)
    comments = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    certificate = relationship("QualityTestCertificate", back_populates="audit_logs")
    user = relationship("User", foreign_keys=[performed_by], lazy="joined")

    def __repr__(self) -> str:
        return f"<QualityReviewLog id={self.id} cert_id={self.certificate_id} action={self.action}>"
