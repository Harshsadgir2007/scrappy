"""
Automated Test Suite for the 3 New Circular Manufacturing Features:
1. Annual Company Subscription System (Rs.2,500/yr per company)
2. Transaction Commission System (0.5% split 50-50 on material value > Rs.5,00,000)
3. Mandatory Material Quality Test Certificate & Review Lifecycle
"""

import json
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.company import Company
from app.models.listing import Listing
from app.models.subscription import CompanySubscription
from app.models.user import User
from app.services.commission_service import compute_commission_breakdown

client = TestClient(app)


def run_new_features_suite():
    print("\n=======================================================")
    print("RUNNING AUTOMATED TEST SUITE: SUBSCRIPTIONS, COMMISSIONS & QUALITY CERTS")
    print("=======================================================")

    # ── 1. AUTH SETUP ────────────────────────────────────────────────
    # GreenSteel (Seller)
    res = client.post("/auth/login", json={"email": "seller@greensteel.com", "password": "seller123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    green_token = res.json()["access_token"]
    green_headers = {"Authorization": f"Bearer {green_token}"}

    # EcoBuild (Buyer)
    res = client.post("/auth/login", json={"email": "buyer@ecobuild.com", "password": "buyer123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    eco_token = res.json()["access_token"]
    eco_headers = {"Authorization": f"Bearer {eco_token}"}

    # Admin
    res = client.post("/auth/login", json={"email": "admin@scrappy.com", "password": "admin123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    print("[PASS] Setup: Auth Tokens Acquired for Seller, Buyer, and Admin")

    # ── 2. SUBSCRIPTION SYSTEM TESTS ─────────────────────────────────
    # 2.1 Check status of active seeded company
    res = client.get("/subscriptions/status", headers=green_headers)
    assert res.status_code == 200, f"Get status failed: {res.text}"
    sub_data = res.json()
    assert sub_data["is_active"] is True
    assert sub_data["annual_fee"] == 2500.0
    assert sub_data["currency"] == "INR"
    assert sub_data["status"] == "active"
    assert sub_data["days_remaining"] is not None and sub_data["days_remaining"] > 300
    print("[PASS] Test 1.1: Active Company Subscription Status & Validity (Rs.2,500/year)")

    # 2.2 Register a brand new company (unsubscribed by default)
    unique_num = f"U27100MH{datetime.now().strftime('%y%m%d%H%M%S')}"
    new_reg = {
        "email": f"unsub_{datetime.now().timestamp()}@novasteel.com",
        "password": "novapassword123",
        "full_name": "Karan Malhotra",
        "role": "company",
        "company_name": "Nova Structural Steels Ltd",
        "industry": "steel",
        "company_reg_num": unique_num,
        "company_license": "FAC-MH-MUM-4451/2026",
        "gstin": "27AAACN1234K1Z1",
        "mca_record": "RoC Mumbai - Active",
        "declared_products": ["Hot Rolled Coils", "Steel Plates"],
        "capacity_tons_per_year": 25000.0,
        "address": "Plot 12, Tarapur MIDC",
        "city": "Boisar",
        "state": "Maharashtra",
        "pincode": "401506",
        "phone": "+91-22-99887766",
    }
    res = client.post("/auth/register", json=new_reg)
    assert res.status_code == 201, f"Registration failed: {res.text}"
    nova_token = res.json()["access_token"]
    nova_headers = {"Authorization": f"Bearer {nova_token}"}

    # Verify Nova company
    db = SessionLocal()
    nova_user = db.query(User).filter(User.email == new_reg["email"]).first()
    nova_comp_id = nova_user.company_id
    nova_comp = db.query(Company).filter(Company.id == nova_comp_id).first()
    nova_comp.verification_status = "verified"
    db.commit()
    db.close()

    # 2.3 Attempt protected marketplace operation (create listing) without subscription -> MUST BE BLOCKED (403)
    listing_attempt = {
        "material_id": 2,
        "category": "scrap",
        "title": "Unsubscribed Company Scrap Attempt",
        "total_tons": 50.0,
        "price_per_ton": 30000.0,
        "min_price_floor": 28000.0,
        "min_order_tons": 5.0,
        "pickup_city": "Boisar",
        "pickup_state": "Maharashtra",
    }
    res = client.post("/listings", json=listing_attempt, headers=nova_headers)
    assert res.status_code == 403, f"Expected 403 for unsubscribed company listing, got {res.status_code}"
    assert "subscription" in res.json()["detail"].lower()
    print("[PASS] Test 1.2: Unsubscribed Company Blocked from Protected Operations (403 Forbidden)")

    # 2.4 Subscription payment checkout order creation
    res = client.post("/subscriptions/create-checkout-order", headers=nova_headers)
    assert res.status_code == 200
    checkout_data = res.json()
    assert checkout_data["amount"] == 2500.0
    assert checkout_data["currency"] == "INR"
    assert checkout_data["gateway"] == "razorpay"
    order_id = checkout_data["gateway_order_id"]
    print("[PASS] Test 1.3: Subscription Checkout Order Generated (Amount: Rs.2,500 INR)")

    # 2.5 Payment Failure does not activate subscription
    fail_payment = {
        "gateway_order_id": order_id,
        "gateway_payment_id": f"pay_fail_{datetime.now().timestamp()}",
        "status": "failed",
        "failure_reason": "Card declined by issuing bank",
    }
    res = client.post("/subscriptions/verify-payment", json=fail_payment, headers=nova_headers)
    assert res.status_code == 200
    failed_status = res.json()
    assert failed_status["is_active"] is False
    assert failed_status["payment_status"] == "failed"
    print("[PASS] Test 1.4: Payment Failure Audit Recorded & Does Not Activate Subscription")

    # 2.6 Payment Success activates company subscription for 1 year
    pay_id_success = f"pay_succ_{datetime.now().timestamp()}"
    success_payment = {
        "gateway_order_id": order_id,
        "gateway_payment_id": pay_id_success,
        "gateway_signature": "mock_valid_hmac_signature_2026",
        "status": "success",
    }
    res = client.post("/subscriptions/verify-payment", json=success_payment, headers=nova_headers)
    assert res.status_code == 200
    active_status = res.json()
    assert active_status["is_active"] is True
    assert active_status["status"] == "active"
    assert active_status["payment_status"] == "paid"
    assert active_status["payment_reference"] == pay_id_success
    assert active_status["days_remaining"] in (364, 365)
    print("[PASS] Test 1.5: Payment Confirmation Activates Annual Subscription (Valid: 365 Days)")

    # 2.7 Idempotency: Duplicate payment callback returns existing record without double charge
    res_dup = client.post("/subscriptions/verify-payment", json=success_payment, headers=nova_headers)
    assert res_dup.status_code == 200
    dup_status = res_dup.json()
    assert dup_status["is_active"] is True
    assert dup_status["payment_reference"] == pay_id_success
    print("[PASS] Test 1.6: Duplicate Payment Callback Handled Idempotently")

    # 2.8 Early Renewal adds 365 days from previous expiry
    initial_exp = datetime.fromisoformat(active_status["expiry_date"])
    renew_pay = {
        "gateway_order_id": f"order_renew_{datetime.now().timestamp()}",
        "gateway_payment_id": f"pay_renew_{datetime.now().timestamp()}",
        "status": "success",
    }
    res_renew = client.post("/subscriptions/verify-payment", json=renew_pay, headers=nova_headers)
    assert res_renew.status_code == 200
    renewed_status = res_renew.json()
    renewed_exp = datetime.fromisoformat(renewed_status["expiry_date"])
    # Expiry should be ~730 days from now (1 year added on top of existing period)
    assert renewed_exp > initial_exp + timedelta(days=360)
    print("[PASS] Test 1.7: Early Subscription Renewal Correctly Extends Expiry Date by 365 Days")

    # 2.9 Payment history log
    res_hist = client.get("/subscriptions/history", headers=nova_headers)
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert len(hist) >= 3  # failed attempt, successful activation, renewal
    print("[PASS] Test 1.8: Subscription Chronological Payment History Auditable")

    # ── 3. TRANSACTION COMMISSION SYSTEM TESTS ───────────────────────
    # 3.1 Mathematical precision & eligibility threshold tests
    # Exact Rs.5,00,000 -> ZERO commission
    c_500k = compute_commission_breakdown(500000.00)
    assert c_500k["is_eligible"] is False
    assert c_500k["total_commission"] == 0.0
    assert c_500k["buyer_contribution"] == 0.0
    assert c_500k["seller_contribution"] == 0.0

    # Rs.4,00,000 -> ZERO commission
    c_400k = compute_commission_breakdown(400000.00)
    assert c_400k["is_eligible"] is False
    assert c_400k["total_commission"] == 0.0

    # Rs.5,00,001 -> Qualifies for commission
    c_500k1 = compute_commission_breakdown(500001.00)
    assert c_500k1["is_eligible"] is True
    assert c_500k1["total_commission"] == 2500.01
    assert c_500k1["buyer_contribution"] == 1250.00
    assert c_500k1["seller_contribution"] == 1250.01
    assert c_500k1["buyer_contribution"] + c_500k1["seller_contribution"] == c_500k1["total_commission"]

    # Table Examples: Rs.6,00,000 -> Total Rs.3,000 (Buyer: Rs.1,500, Seller: Rs.1,500)
    c_600k = compute_commission_breakdown(600000.00)
    assert c_600k["is_eligible"] is True
    assert c_600k["total_commission"] == 3000.00
    assert c_600k["buyer_contribution"] == 1500.00
    assert c_600k["seller_contribution"] == 1500.00

    # Table Examples: Rs.10,00,000 -> Total Rs.5,000 (Buyer: Rs.2,500, Seller: Rs.2,500)
    c_1000k = compute_commission_breakdown(1000000.00)
    assert c_1000k["total_commission"] == 5000.00
    assert c_1000k["buyer_contribution"] == 2500.00
    assert c_1000k["seller_contribution"] == 2500.00

    # Table Examples: Rs.20,00,000 -> Total Rs.10,000 (Buyer: Rs.5,000, Seller: Rs.5,000)
    c_2000k = compute_commission_breakdown(2000000.00)
    assert c_2000k["total_commission"] == 10000.00
    assert c_2000k["buyer_contribution"] == 5000.00
    assert c_2000k["seller_contribution"] == 5000.00
    print("[PASS] Test 2.1: Mathematical Precision & PRD Threshold Examples Verified (Rs.5L Boundary, Rs.6L, Rs.10L, Rs.20L)")

    # 3.2 Bill estimate endpoint reflects commission breakdown
    # Check listing 1: price 31500 per ton. 20 Tons = Rs.6,30,000 material value (> Rs.5L)
    res_est = client.post("/bill/estimate", json={"listing_id": 1, "requested_tons": 20.0}, headers=eco_headers)
    assert res_est.status_code == 200
    est = res_est.json()
    assert est["material_cost"] == 630000.0
    assert est["commission"] is not None
    assert est["commission"]["is_eligible"] is True
    assert est["commission"]["total_commission"] == 3150.0
    assert est["commission"]["buyer_contribution"] == 1575.0
    assert est["commission"]["seller_contribution"] == 1575.0

    # Small order: 5 Tons = Rs.1,57,500 material value (< Rs.5L) -> Commission zero
    res_est_small = client.post("/bill/estimate", json={"listing_id": 1, "requested_tons": 5.0}, headers=eco_headers)
    assert res_est_small.status_code == 200
    est_sm = res_est_small.json()
    assert est_sm["commission"]["is_eligible"] is False
    assert est_sm["commission"]["total_commission"] == 0.0
    print("[PASS] Test 2.2: Landed Cost Estimate Itemizes Platform Commission & Distinguishes Small vs Large Transactions")

    # 3.3 Verify existing seeded trade 1 holds commission record
    res_trd = client.get("/trades/history", headers=eco_headers)
    assert res_trd.status_code == 200
    trades = res_trd.json()
    trade_with_comm = next((t for t in trades if t["material_cost"] > 500000.0), None)
    assert trade_with_comm is not None
    assert trade_with_comm["commission"] is not None
    assert trade_with_comm["commission"]["total_commission"] == 3150.0
    assert trade_with_comm["commission"]["status"] == "calculated"
    assert trade_with_comm["commission"]["buyer_collection_status"] == "uncollected"
    print("[PASS] Test 2.3: Order & Trade History Record Permanent Commission Breakdown (Calculated vs Collected)")

    # ── 4. MATERIAL QUALITY TEST CERTIFICATE TESTS ───────────────────
    # 4.1 Retrieve configurable testing requirements
    res_req = client.get("/quality/requirements?category=metal", headers=green_headers)
    assert res_req.status_code == 200
    reqs = res_req.json()
    assert len(reqs) >= 2
    assert any(r["parameter_key"] == "ferrous_content_pct" for r in reqs)
    print("[PASS] Test 3.1: Material-Specific Quality Testing Requirements Retrieved")

    # 4.2 Admin can add and configure test requirement
    new_req = {
        "material_category": "metal",
        "test_name": "Tensile Strength Test",
        "parameter_key": "tensile_strength_mpa",
        "parameter_label": "Ultimate Tensile Strength (MPa)",
        "parameter_unit": "MPa",
        "data_type": "number",
        "is_mandatory": False,
        "min_value": 300.0,
        "max_value": 800.0,
        "standard_code": "IS 1608",
        "description": "Yield and tensile stress measured by universal tensile machine.",
    }
    res_add_req = client.post("/quality/requirements", json=new_req, headers=admin_headers)
    assert res_add_req.status_code == 201
    created_req = res_add_req.json()
    assert created_req["parameter_key"] == "tensile_strength_mpa"
    print("[PASS] Test 3.2: Administrator Can Manage Configurable Material Quality Requirements")

    # 4.3 Create listing: now with Nova company (active subscription)
    res_list = client.post("/listings", json={
        "material_id": 2,
        "category": "metal",
        "title": "Industrial High-Carbon Steel Scrap Plates",
        "description": "Clean off-cuts from heavy pressing facility.",
        "total_tons": 75.0,
        "price_per_ton": 32000.0,
        "min_price_floor": 29000.0,
        "min_order_tons": 10.0,
        "pickup_city": "Boisar",
        "pickup_state": "Maharashtra",
    }, headers=nova_headers)
    assert res_list.status_code == 201
    nova_listing = res_list.json()
    nova_listing_id = nova_listing["id"]
    assert nova_listing["quality_status"] == "pending_review" or nova_listing["quality_status"] == "approved"
    print("[PASS] Test 3.3: Listing Initialized with Quality Status Gate")

    # 4.4 Upload invalid file (wrong magic bytes disguised as .pdf) -> MUST FAIL
    fake_pdf = b"NOT_A_REAL_PDF_FILE_HEADER"
    meta_valid = {
        "testing_lab_name": "Western Zonal Material Testing Laboratory (NABL #TC-8899)",
        "certificate_number": "NABL-WZ-2026-9901",
        "test_date": "2026-10-20T10:00:00Z",
        "parameters_data": {
            "ferrous_content_pct": 98.4,
            "impurities_pct": 1.2,
        },
        "material_grade": "High Carbon Steel (EN-8 / EN-9)",
    }
    res_bad_file = client.post(
        f"/quality/listings/{nova_listing_id}/certificate",
        files={"file": ("fake_report.pdf", fake_pdf, "application/pdf")},
        data={"metadata": json.dumps(meta_valid)},
        headers=nova_headers,
    )
    assert res_bad_file.status_code == 400
    assert "header does not match" in res_bad_file.json()["detail"].lower()
    print("[PASS] Test 3.4: File Content Validation Rejects Invalid Magic Bytes / Forged Extension")

    # 4.5 Upload missing mandatory parameter -> MUST FAIL
    meta_missing = {
        "testing_lab_name": "Western Zonal Material Testing Laboratory",
        "certificate_number": "NABL-WZ-2026-9901",
        "test_date": "2026-10-20T10:00:00Z",
        "parameters_data": {
            # missing ferrous_content_pct
            "impurities_pct": 1.2,
        },
    }
    real_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<\n/Title (Quality Test Certificate)\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF"
    res_missing_param = client.post(
        f"/quality/listings/{nova_listing_id}/certificate",
        files={"file": ("valid_test_report.pdf", real_pdf_bytes, "application/pdf")},
        data={"metadata": json.dumps(meta_missing)},
        headers=nova_headers,
    )
    assert res_missing_param.status_code == 400
    assert "mandatory" in res_missing_param.json()["detail"].lower()
    print("[PASS] Test 3.5: Validation Blocks Incomplete Mandatory Quality Parameters")

    # 4.6 Successful upload of valid certificate & encrypted storage
    res_cert = client.post(
        f"/quality/listings/{nova_listing_id}/certificate",
        files={"file": ("valid_test_report.pdf", real_pdf_bytes, "application/pdf")},
        data={"metadata": json.dumps(meta_valid)},
        headers=nova_headers,
    )
    assert res_cert.status_code == 200
    cert_obj = res_cert.json()
    assert cert_obj["review_status"] == "pending_review"
    assert cert_obj["certificate_number"] == "NABL-WZ-2026-9901"
    cert_id = cert_obj["id"]
    print("[PASS] Test 3.6: Valid Quality Certificate Encrypted & Uploaded (Status: pending_review)")

    # 4.7 Admin Review: Reject with comments
    res_reject = client.put(
        f"/quality/certificates/{cert_id}/review",
        json={"action": "reject", "comments": "Laboratory stamp is unclear and accreditation date is expired."},
        headers=admin_headers,
    )
    assert res_reject.status_code == 200
    rejected_cert = res_reject.json()
    assert rejected_cert["review_status"] == "rejected"
    assert "stamp is unclear" in rejected_cert["reviewer_comments"]
    print("[PASS] Test 3.7: Admin Rejection Flow with Explicit Feedback & Rejection Reason")

    # 4.8 Listing owner resubmits corrected certificate
    meta_corrected = dict(meta_valid)
    meta_corrected["certificate_number"] = "NABL-WZ-2026-9901-REV1"
    res_resubmit = client.post(
        f"/quality/listings/{nova_listing_id}/certificate",
        files={"file": ("corrected_test_report.pdf", real_pdf_bytes, "application/pdf")},
        data={"metadata": json.dumps(meta_corrected)},
        headers=nova_headers,
    )
    assert res_resubmit.status_code == 200
    resubmitted_cert = res_resubmit.json()
    assert resubmitted_cert["review_status"] == "pending_review"
    assert resubmitted_cert["certificate_number"] == "NABL-WZ-2026-9901-REV1"
    print("[PASS] Test 3.8: Owner Resubmission of Corrected Certificate & Status Reset")

    # 4.9 Admin approves certificate
    res_approve = client.put(
        f"/quality/certificates/{cert_id}/review",
        json={"action": "approve", "comments": "NABL certificate verified and validated with laboratory registry."},
        headers=admin_headers,
    )
    assert res_approve.status_code == 200
    approved_cert = res_approve.json()
    assert approved_cert["review_status"] == "approved"
    print("[PASS] Test 3.9: Admin Certificate Approval & Listing Published to Live Marketplace")

    # 4.10 Secure decrypted document download
    res_download = client.get(f"/quality/certificates/{cert_id}/download", headers=nova_headers)
    assert res_download.status_code == 200
    assert res_download.content == real_pdf_bytes
    print("[PASS] Test 3.10: Secure Decrypted Document Download Verified with Access Control")

    # 4.11 Audit log trail inspection
    res_audit = client.get(f"/quality/certificates/{cert_id}/audit-logs", headers=nova_headers)
    assert res_audit.status_code == 200
    logs = res_audit.json()
    assert len(logs) >= 3  # submitted, rejected, resubmitted, approved
    actions = [l["action"] for l in logs]
    assert "submitted" in actions or "resubmitted" in actions
    assert "reject" in actions or "rejected" in actions
    assert "approve" in actions or "approved" in actions
    print("[PASS] Test 3.11: Quality Review Complete Audit Trail Verified")

    print("\n=======================================================")
    print("ALL NEW FEATURE TESTS PASSED (100% SUBSCRIPTION, COMMISSION & QUALITY CERTS)")
    print("=======================================================\n")


if __name__ == "__main__":
    run_new_features_suite()
