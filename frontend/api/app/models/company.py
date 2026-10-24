"""
Company ORM model.

Represents an industrial company registered on the platform. Each company
can have one or more users (employees) and must go through admin
verification before its users can trade materials.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    industry = Column(String(128), nullable=False)

    # Statutory & Government Identifiers
    company_reg_num = Column(String(64), nullable=True, index=True)  # CIN / Incorporation No
    company_license = Column(String(64), nullable=True)  # Factory / Industrial License No
    gstin = Column(String(20), nullable=True, index=True)  # 15-character GSTIN
    mca_record = Column(String(255), nullable=True)  # MCA RoC Filing & Compliance Status

    # JSON-encoded list of product names the company declares
    declared_products = Column(Text, nullable=True)

    capacity_tons_per_year = Column(Float, nullable=True)

    # Address fields
    address = Column(String(512), nullable=True)
    city = Column(String(128), nullable=True)
    state = Column(String(128), nullable=True)
    pincode = Column(String(10), nullable=True)

    # Geolocation (optional, for proximity features in later phases)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    phone = Column(String(20), nullable=True)

    # Encrypted license document path (stored in uploads/)
    license_file_path = Column(String(512), nullable=True)

    # Verification workflow
    verification_status = Column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
    )
    verified_at = Column(DateTime, nullable=True)
    admin_notes = Column(Text, nullable=True)

    # Timestamps
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

    # ── Relationships ───────────────────────────────────────────────────
    users = relationship("User", back_populates="company", lazy="selectin")
    subscription = relationship("CompanySubscription", back_populates="company", uselist=False, lazy="joined")

    def __repr__(self) -> str:
        return f"<Company id={self.id} name={self.name!r} status={self.verification_status}>"
