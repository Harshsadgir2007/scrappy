"""add_subscriptions_commissions_and_quality_certs

Revision ID: 834afdbc44e4
Revises: 
Create Date: 2026-10-25 01:42:12.845599

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '834afdbc44e4'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. company_subscriptions
    if "company_subscriptions" not in existing_tables:
        op.create_table(
            "company_subscriptions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), unique=True, nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="inactive"),
            sa.Column("annual_fee", sa.Float(), nullable=False, server_default="2500.0"),
            sa.Column("currency", sa.String(length=10), nullable=False, server_default="INR"),
            sa.Column("start_date", sa.DateTime(), nullable=True),
            sa.Column("expiry_date", sa.DateTime(), nullable=True),
            sa.Column("payment_status", sa.String(length=30), nullable=False, server_default="pending"),
            sa.Column("payment_reference", sa.String(length=128), nullable=True),
            sa.Column("last_renewed_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_company_subscriptions_company_id", "company_subscriptions", ["company_id"])

    # 2. subscription_payments
    if "subscription_payments" not in existing_tables:
        op.create_table(
            "subscription_payments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("subscription_id", sa.Integer(), sa.ForeignKey("company_subscriptions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False, server_default="2500.0"),
            sa.Column("currency", sa.String(length=10), nullable=False, server_default="INR"),
            sa.Column("payment_gateway", sa.String(length=64), nullable=False, server_default="razorpay"),
            sa.Column("gateway_order_id", sa.String(length=128), nullable=True),
            sa.Column("gateway_payment_id", sa.String(length=128), nullable=True, unique=True),
            sa.Column("gateway_signature", sa.String(length=256), nullable=True),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="pending"),
            sa.Column("period_start", sa.DateTime(), nullable=False),
            sa.Column("period_end", sa.DateTime(), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_subscription_payments_subscription_id", "subscription_payments", ["subscription_id"])
        op.create_index("ix_subscription_payments_company_id", "subscription_payments", ["company_id"])
        op.create_index("ix_subscription_payments_gateway_order_id", "subscription_payments", ["gateway_order_id"])

    # 3. transaction_commissions
    if "transaction_commissions" not in existing_tables:
        op.create_table(
            "transaction_commissions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False),
            sa.Column("trade_id", sa.Integer(), sa.ForeignKey("trade_history.id", ondelete="SET NULL"), nullable=True),
            sa.Column("material_transaction_value", sa.Float(), nullable=False),
            sa.Column("commission_rate", sa.Float(), nullable=False, server_default="0.005"),
            sa.Column("total_commission", sa.Float(), nullable=False),
            sa.Column("buyer_rate", sa.Float(), nullable=False, server_default="0.0025"),
            sa.Column("buyer_contribution", sa.Float(), nullable=False),
            sa.Column("seller_rate", sa.Float(), nullable=False, server_default="0.0025"),
            sa.Column("seller_contribution", sa.Float(), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="calculated"),
            sa.Column("buyer_collection_status", sa.String(length=30), nullable=False, server_default="uncollected"),
            sa.Column("seller_collection_status", sa.String(length=30), nullable=False, server_default="uncollected"),
            sa.Column("buyer_payment_ref", sa.String(length=128), nullable=True),
            sa.Column("seller_payment_ref", sa.String(length=128), nullable=True),
            sa.Column("buyer_collected_at", sa.DateTime(), nullable=True),
            sa.Column("seller_collected_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_transaction_commissions_order_id", "transaction_commissions", ["order_id"])
        op.create_index("ix_transaction_commissions_trade_id", "transaction_commissions", ["trade_id"])

    # 4. material_quality_requirements
    if "material_quality_requirements" not in existing_tables:
        op.create_table(
            "material_quality_requirements",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("material_id", sa.Integer(), sa.ForeignKey("materials.id", ondelete="CASCADE"), nullable=True),
            sa.Column("material_category", sa.String(length=64), nullable=True),
            sa.Column("test_name", sa.String(length=255), nullable=False),
            sa.Column("parameter_key", sa.String(length=64), nullable=False),
            sa.Column("parameter_label", sa.String(length=255), nullable=False),
            sa.Column("parameter_unit", sa.String(length=32), nullable=True),
            sa.Column("data_type", sa.String(length=32), nullable=False, server_default="number"),
            sa.Column("is_mandatory", sa.Boolean(), nullable=False, server_default="1"),
            sa.Column("min_value", sa.Float(), nullable=True),
            sa.Column("max_value", sa.Float(), nullable=True),
            sa.Column("standard_code", sa.String(length=64), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_material_quality_requirements_material_id", "material_quality_requirements", ["material_id"])
        op.create_index("ix_material_quality_requirements_material_category", "material_quality_requirements", ["material_category"])

    # 5. quality_test_certificates
    if "quality_test_certificates" not in existing_tables:
        op.create_table(
            "quality_test_certificates",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
            sa.Column("material_id", sa.Integer(), sa.ForeignKey("materials.id", ondelete="CASCADE"), nullable=False),
            sa.Column("material_category", sa.String(length=64), nullable=False),
            sa.Column("material_grade", sa.String(length=128), nullable=True),
            sa.Column("test_name", sa.String(length=255), nullable=False),
            sa.Column("testing_lab_name", sa.String(length=255), nullable=False),
            sa.Column("lab_accreditation", sa.String(length=128), nullable=True),
            sa.Column("certificate_number", sa.String(length=128), nullable=False),
            sa.Column("test_date", sa.DateTime(), nullable=False),
            sa.Column("valid_until", sa.DateTime(), nullable=True),
            sa.Column("parameters_data", sa.Text(), nullable=False),
            sa.Column("test_result_summary", sa.Text(), nullable=True),
            sa.Column("file_path", sa.String(length=512), nullable=False),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("file_size_bytes", sa.Integer(), nullable=False),
            sa.Column("mime_type", sa.String(length=64), nullable=False),
            sa.Column("review_status", sa.String(length=32), nullable=False, server_default="pending_review"),
            sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(), nullable=True),
            sa.Column("reviewer_comments", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_quality_test_certificates_listing_id", "quality_test_certificates", ["listing_id"])
        op.create_index("ix_quality_test_certificates_company_id", "quality_test_certificates", ["company_id"])
        op.create_index("ix_quality_test_certificates_material_id", "quality_test_certificates", ["material_id"])
        op.create_index("ix_quality_test_certificates_review_status", "quality_test_certificates", ["review_status"])
        op.create_index("ix_quality_test_certificates_certificate_number", "quality_test_certificates", ["certificate_number"])

    # 6. quality_review_logs
    if "quality_review_logs" not in existing_tables:
        op.create_table(
            "quality_review_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("certificate_id", sa.Integer(), sa.ForeignKey("quality_test_certificates.id", ondelete="CASCADE"), nullable=False),
            sa.Column("performed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("action", sa.String(length=32), nullable=False),
            sa.Column("previous_status", sa.String(length=32), nullable=True),
            sa.Column("new_status", sa.String(length=32), nullable=False),
            sa.Column("comments", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_quality_review_logs_certificate_id", "quality_review_logs", ["certificate_id"])

    # 7. listings.quality_status column
    if "listings" in existing_tables:
        columns = [c["name"] for c in inspector.get_columns("listings")]
        if "quality_status" not in columns:
            with op.batch_alter_table('listings', schema=None) as batch_op:
                batch_op.add_column(sa.Column('quality_status', sa.String(length=32), nullable=False, server_default="approved"))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "quality_review_logs" in existing_tables:
        op.drop_table("quality_review_logs")
    if "quality_test_certificates" in existing_tables:
        op.drop_table("quality_test_certificates")
    if "material_quality_requirements" in existing_tables:
        op.drop_table("material_quality_requirements")
    if "transaction_commissions" in existing_tables:
        op.drop_table("transaction_commissions")
    if "subscription_payments" in existing_tables:
        op.drop_table("subscription_payments")
    if "company_subscriptions" in existing_tables:
        op.drop_table("company_subscriptions")

    if "listings" in existing_tables:
        columns = [c["name"] for c in inspector.get_columns("listings")]
        if "quality_status" in columns:
            with op.batch_alter_table('listings', schema=None) as batch_op:
                batch_op.drop_column('quality_status')
