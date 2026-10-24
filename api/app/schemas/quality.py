"""
Pydantic schemas for Material Quality Testing and Certification.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class QualityRequirementResponse(BaseModel):
    id: int
    material_id: int | None = None
    material_category: str | None = None
    test_name: str
    parameter_key: str
    parameter_label: str
    parameter_unit: str | None = None
    data_type: str
    is_mandatory: bool
    min_value: float | None = None
    max_value: float | None = None
    standard_code: str | None = None
    description: str | None = None

    model_config = {"from_attributes": True}


class QualityRequirementCreate(BaseModel):
    material_id: int | None = None
    material_category: str | None = None
    test_name: str
    parameter_key: str
    parameter_label: str
    parameter_unit: str | None = None
    data_type: str = "number"
    is_mandatory: bool = True
    min_value: float | None = None
    max_value: float | None = None
    standard_code: str | None = None
    description: str | None = None


class QualityCertificateResponse(BaseModel):
    id: int
    listing_id: int
    company_id: int
    material_id: int
    material_category: str
    material_grade: str | None = None
    test_name: str
    testing_lab_name: str
    lab_accreditation: str | None = None
    certificate_number: str
    test_date: datetime
    valid_until: datetime | None = None
    parameters_data: dict = Field(default_factory=dict)
    test_result_summary: str | None = None
    original_filename: str
    file_size_bytes: int
    mime_type: str
    review_status: str
    reviewed_at: datetime | None = None
    reviewer_comments: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class QualityReviewAction(BaseModel):
    action: str  # approve, reject, info_required
    comments: str | None = None


class QualityReviewLogResponse(BaseModel):
    id: int
    certificate_id: int
    performed_by: int | None = None
    reviewer_name: str | None = None
    action: str
    previous_status: str | None = None
    new_status: str
    comments: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
