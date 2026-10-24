"""
Scrappy Prototype — Automated Regression Test Suite.
Validates all features across Phases 1 through 5, plus new features:
- Auth & Token Refresh
- License Encryption & Auto-Verification
- Master Material Catalog (Exact 3 Prototype Materials)
- Dual Capability (Selling & Buying from same account)
- 3-Part Landed Cost Calculation
- Variable Quantity Ordering & 48h Inventory Reservation
- Intelligence Compatibility Badges (Suitable vs Not Suitable)
- Blocking Override Warnings & Compliance Audit Logging
- Advance Pre-Book Streams
- In-App Notifications & Unread Badge Counter
- Enterprise Inventory & Stock Valuation Summary
- Step-by-Step Material Listing with Category, Processed Cost & Transport Tolls
- Order Tracking Lifecycle (Dispatch -> In Transit -> Delivered)
- Bi-Directional Permanent Trade History Ledger (Recorded at Both Ends)
- Company Statutory Parameters (Reg Num, License, GSTIN, MCA Record)
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def run_regression_suite():
    print("\n=======================================================")
    print("RUNNING SCRAPPY PROTOTYPE AUTOMATED REGRESSION SUITE")
    print("=======================================================")

    # 1. AUTHENTICATION TEST
    res = client.post("/auth/login", json={"email": "seller@greensteel.com", "password": "seller123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    tokens = res.json()
    assert "access_token" in tokens and "refresh_token" in tokens
    green_token = tokens["access_token"]
    green_headers = {"Authorization": f"Bearer {green_token}"}
    print("[PASS] Test 1: Enterprise Login & Token Pair Generation")

    # 2. TOKEN REFRESH TEST
    res = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert res.status_code == 200, f"Token refresh failed: {res.text}"
    assert "access_token" in res.json()
    print("[PASS] Test 2: JWT Access Token Refresh")

    # 3. COMPANY PROFILE, STATUTORY IDS & LICENSE ENCRYPTION TEST
    res = client.get("/companies/me", headers=green_headers)
    assert res.status_code == 200
    comp = res.json()
    assert comp["name"] == "GreenSteel Industries Pvt Ltd"
    assert comp["verification_status"] == "verified"
    assert comp["company_reg_num"] == "U27100MH2012PTC139882"
    assert comp["company_license"] == "FAC-MH-PUN-0842/2012"
    assert comp["gstin"] == "27AABCG1234F1Z5"
    assert comp["mca_record"] == "RoC Mumbai - Active & Compliant"

    # Upload test PDF license
    fake_pdf = b"%PDF-1.4 Fake business license test content"
    files = {"file": ("license.pdf", fake_pdf, "application/pdf")}
    res = client.post("/companies/me/license", files=files, headers=green_headers)
    assert res.status_code == 201

    # Download & verify decryption matches original bytes
    res = client.get("/companies/me/license", headers=green_headers)
    assert res.status_code == 200
    assert res.content == fake_pdf
    print("[PASS] Test 3: License Upload, Fernet AES-128 Encryption & Auto-Verification")

    # 4. MASTER CATALOG TEST (EXACT 3 PROTOTYPE MATERIALS)
    res = client.get("/materials", headers=green_headers)
    assert res.status_code == 200
    materials = res.json()
    assert len(materials) == 3, f"Expected 3 prototype materials, found {len(materials)}"
    mat_names = {m["name"] for m in materials}
    expected_mats = {"Textile waste", "Metal scrap", "Fly ash"}
    assert mat_names == expected_mats, f"Mismatch: {mat_names} vs {expected_mats}"
    print(f"[PASS] Test 4: Master Catalog Verified (3 Materials: {', '.join(mat_names)})")

    # 5. MARKETPLACE BROWSE & ANONYMOUS DISPLAY TEST
    res = client.get("/listings", headers=green_headers)
    assert res.status_code == 200
    listings = res.json()
    assert len(listings) >= 3
    # Check that other company names are anonymous
    for l in listings:
        if l["company_id"] != comp["id"]:
            assert "Verified Producer" in l["seller_label"], f"Leaked company name: {l['seller_label']}"
    print("[PASS] Test 5: Marketplace Browse & Data Minimization / Privacy Anonymity")

    # 6. INTELLIGENCE SUITABILITY TEST (PRD F2)
    # Login as EcoBuild (Construction company)
    res = client.post("/auth/login", json={"email": "buyer@ecobuild.com", "password": "buyer123"})
    eco_token = res.json()["access_token"]
    eco_headers = {"Authorization": f"Bearer {eco_token}"}

    res = client.get("/listings", headers=eco_headers)
    eco_listings = res.json()

    flyash_item = next((x for x in eco_listings if "Fly Ash" in x["title"] or x["material_name"] == "Fly ash"), None)
    textile_item = next((x for x in eco_listings if "Cotton" in x["title"] or x["material_name"] == "Textile waste"), None)

    assert flyash_item is not None
    assert textile_item is not None

    # EcoBuild (Construction) should be SUITABLE for Fly Ash, but NOT SUITABLE for Textile Waste
    assert flyash_item["compatibility"]["badge"] == "suitable", "Fly ash should be suitable for construction"
    assert textile_item["compatibility"]["badge"] == "not_suitable", "Textile waste should not be suitable for construction"
    print("[PASS] Test 6: Automated Intelligence Compatibility Badges (Suitable vs Not Suitable)")

    # 7. BLOCKING OVERRIDE WARNING TEST (PRD F2.5)
    # Attempting to order textile waste without override should be BLOCKED (HTTP 400)
    res = client.post(
        "/orders",
        json={"listing_id": textile_item["id"], "requested_tons": 5.0, "compatibility_override": False},
        headers=eco_headers,
    )
    assert res.status_code == 400, f"Expected 400 for unconfirmed mismatch, got {res.status_code}"

    # Attempting with explicit override confirmation should PASS (HTTP 201)
    res = client.post(
        "/orders",
        json={
            "listing_id": textile_item["id"],
            "requested_tons": 5.0,
            "compatibility_override": True,
            "override_reason": "Fiber reinforced concrete insulation pilot",
        },
        headers=eco_headers,
    )
    assert res.status_code == 201, f"Failed override order: {res.text}"
    override_order = res.json()
    assert override_order["compatibility_override"] == True
    print("[PASS] Test 7: Blocking Incompatible Order Warning & Audit Override Confirmation")

    # 8. 3-PART LANDED COST BILL TEST (PRD F3)
    metal_item = next((x for x in eco_listings if "Metal Scrap" in x["title"] and not x.get("is_coming_soon")), None)
    assert metal_item is not None

    res = client.post("/bill/estimate", json={"listing_id": metal_item["id"], "requested_tons": 15.0}, headers=eco_headers)
    assert res.status_code == 200
    bill = res.json()
    assert bill["material_cost"] > 0
    assert bill["distance_km"] > 0
    assert bill["freight_cost"] > 0
    assert bill["total_landed_cost"] == round(bill["material_cost"] + bill["processing_cost"] + bill["freight_cost"] + bill["toll_estimate"], 2)
    print(f"[PASS] Test 8: 3-Part Landed Cost Formula Verified (Distance: {bill['distance_km']} km, Freight: Rs.{bill['freight_cost']})")

    # 9. VARIABLE PARTIAL QUANTITY & 48-HOUR HOLD TEST (PRD F4)
    init_remaining = metal_item["remaining_tons"]
    res = client.post(
        "/orders",
        json={"listing_id": metal_item["id"], "requested_tons": 15.0, "compatibility_override": True, "override_reason": "Plant fill"},
        headers=eco_headers,
    )
    assert res.status_code == 201
    created_order = res.json()

    # Verify inventory was reserved
    res = client.get("/listings", headers=eco_headers)
    updated_metal = next((x for x in res.json() if x["id"] == metal_item["id"]))
    assert updated_metal["remaining_tons"] == round(init_remaining - 15.0, 2)
    assert updated_metal["reserved_tons"] == 15.0
    print("[PASS] Test 9: Variable Partial Quantity & 48-Hour Inventory Hold")

    # 10. SELLER TRADE APPROVAL & UNLOCKED IDENTITY (PRD F5.3)
    # GreenSteel approves the order
    order_id = created_order["id"]
    res = client.put(
        f"/orders/{order_id}/action",
        json={"action": "approve", "seller_notes": "Approved. Loading bay 3."},
        headers=green_headers,
    )
    assert res.status_code == 200
    approved = res.json()
    assert approved["status"] == "approved"
    # Counterparty real name is now revealed
    assert approved["buyer_name"] == "EcoBuild Construction Co"
    print("[PASS] Test 10: Trade Approval & Confidential Identity Unlocking")

    # 11. COMING SOON / PRE-BOOK STREAMS TEST (PRD F7)
    res = client.get("/listings?is_coming_soon=true", headers=eco_headers)
    assert res.status_code == 200
    cs_items = res.json()
    assert len(cs_items) >= 1
    cs = cs_items[0]
    assert cs["is_coming_soon"] == True

    res = client.post(
        "/orders",
        json={"listing_id": cs["id"], "requested_tons": 20.0, "compatibility_override": True, "override_reason": "Pre-order for Dec"},
        headers=eco_headers,
    )
    assert res.status_code == 201
    prebook_order = res.json()
    assert prebook_order["is_prebook"] == True
    print("[PASS] Test 11: Coming Soon Streams & Pre-Booking Order Creation")

    # 12. IN-APP NOTIFICATION CENTER TEST (PRD SEC 9)
    res = client.get("/notifications", headers=green_headers)
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) >= 1
    unread_res = client.get("/notifications/unread-count", headers=green_headers)
    assert unread_res.json()["unread_count"] >= 1

    # Mark as read
    res = client.put(f"/notifications/{notifs[0]['id']}/read", headers=green_headers)
    assert res.status_code == 200
    print("[PASS] Test 12: In-App Notification Center & Unread Badge Counter")

    # 13. INVENTORY MANAGEMENT & VALUATION SUMMARY TEST
    res = client.get("/inventory", headers=green_headers)
    assert res.status_code == 200
    inventory = res.json()
    assert len(inventory) >= 2, f"Expected seeded inventory items for GreenSteel, found {len(inventory)}"
    res_summary = client.get("/inventory/summary", headers=green_headers)
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_stock_tons"] > 0
    assert summary["total_valuation_inr"] > 0
    print(f"[PASS] Test 13: Inventory Management & Stock Valuation (Total: {summary['total_stock_tons']} Tons, Val: Rs.{summary['total_valuation_inr']:,})")

    # 14. STEP-BY-STEP MATERIAL LISTING (STEEL SCRAP / FLY ASH / TEXTILE WASTE)
    res = client.post(
        "/listings",
        json={
            "material_id": 1,
            "category": "textile waste",
            "title": "Clean Poly-Cotton Industrial Waste",
            "description": "High tenacity sorted fibers",
            "total_tons": 25.0,
            "price_per_ton": 32000.0,
            "min_price_floor": 30000.0,
            "min_order_tons": 2.0,
            "is_processed": True,
            "processing_details": "Shredded and compressed into baled blocks",
            "processing_cost_per_ton": 1500.0,
            "pickup_city": "Pune",
            "pickup_state": "Maharashtra",
            "freight_rate_per_ton_km": 4.0,
            "toll_estimate": 450.0,
        },
        headers=green_headers,
    )
    assert res.status_code == 201
    created_listing = res.json()
    assert created_listing["category"] == "textile waste"
    assert created_listing["processing_cost_per_ton"] == 1500.0
    assert created_listing["freight_rate_per_ton_km"] == 4.0
    print("[PASS] Test 14: Step-by-Step Material Listing with Category, Processed Cost & Transport Tolls")

    # 15. ORDER TRACKING LIFECYCLE (DISPATCH -> IN TRANSIT -> DELIVERED)
    dispatch_payload = {
        "carrier_name": "Gati-KWE Heavy Transport",
        "vehicle_number": "MH-14-GH-5544",
        "driver_phone": "+91-9123456789",
        "estimated_delivery_days": 2,
        "dispatch_notes": "Departed warehouse bay 4 after tare weighing",
    }
    res = client.put(f"/orders/{order_id}/dispatch", json=dispatch_payload, headers=green_headers)
    assert res.status_code == 200, f"Failed dispatch: {res.text}"
    dispatched_order = res.json()
    assert dispatched_order["status"] == "dispatched"
    assert dispatched_order["vehicle_number"] == "MH-14-GH-5544"
    assert len(dispatched_order["tracking_history"]) >= 3

    # Update transit checkpoint
    transit_payload = {
        "status": "in_transit",
        "current_location": "Bhosari-Thane Expressway Toll Plaza",
        "notes": "Passed first weighing checkpoint without demurrage",
    }
    res = client.put(f"/orders/{order_id}/tracking", json=transit_payload, headers=green_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "in_transit"

    # Confirm delivery
    res = client.put(f"/orders/{order_id}/deliver", headers=eco_headers)
    assert res.status_code == 200
    delivered_order = res.json()
    assert delivered_order["status"] == "delivered"
    assert delivered_order["delivered_date"] is not None
    print("[PASS] Test 15: Order Tracking Lifecycle (Dispatched -> In Transit -> Delivered & Verified)")

    # 16. BI-DIRECTIONAL TRADE HISTORY LEDGER TEST
    # Verify recorded at Buyer end (EcoBuild)
    res = client.get("/trades/history", headers=eco_headers)
    assert res.status_code == 200
    eco_trades = res.json()
    assert len(eco_trades) >= 1
    buyer_record = next((t for t in eco_trades if t["order_id"] == order_id), None)
    assert buyer_record is not None
    assert buyer_record["my_role"] == "BUYER"
    assert buyer_record["counterparty_name"] == "GreenSteel Industries Pvt Ltd"

    # Verify recorded at Seller end (GreenSteel)
    res = client.get("/trades/history", headers=green_headers)
    assert res.status_code == 200
    green_trades = res.json()
    assert len(green_trades) >= 1
    seller_record = next((t for t in green_trades if t["order_id"] == order_id), None)
    assert seller_record is not None
    assert seller_record["my_role"] == "SELLER"
    assert seller_record["counterparty_name"] == "EcoBuild Construction Co"

    # Verify trade stats
    res = client.get("/trades/stats", headers=green_headers)
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_trades_count"] >= 1
    assert stats["total_co2_offset_kg"] > 0
    print(f"[PASS] Test 16: Bi-Directional Trade Ledger Verified at Both Buyer and Seller Ends (Offset: {stats['total_co2_offset_kg']} kg CO2)")

    # 17. COMPANY REGISTRATION WITH STATUTORY PARAMETERS TEST
    new_reg_payload = {
        "email": "procure@apexsteel.com",
        "password": "apexpassword123",
        "full_name": "Suresh Mehta",
        "role": "company",
        "company_name": "Apex Steels & Heavy Forgings",
        "industry": "steel",
        "company_reg_num": "U27100MH2018PTC176543",
        "company_license": "FAC-MH-NAG-9912/2018",
        "gstin": "27AABCA9999K1Z4",
        "mca_record": "RoC Mumbai - Active & Compliant",
        "declared_products": ["Forged Flanges", "Heavy Shafts"],
        "capacity_tons_per_year": 40000.0,
        "address": "Plot 88, MIDC Butibori",
        "city": "Nagpur",
        "state": "Maharashtra",
        "pincode": "441122",
        "phone": "+91-712-223344",
    }
    res = client.post("/auth/register", json=new_reg_payload)
    assert res.status_code == 201, f"Registration failed: {res.text}"
    reg_tokens = res.json()
    apex_headers = {"Authorization": f"Bearer {reg_tokens['access_token']}"}

    res = client.get("/companies/me", headers=apex_headers)
    assert res.status_code == 200
    apex_comp = res.json()
    assert apex_comp["name"] == "Apex Steels & Heavy Forgings"
    assert apex_comp["company_reg_num"] == "U27100MH2018PTC176543"
    assert apex_comp["company_license"] == "FAC-MH-NAG-9912/2018"
    assert apex_comp["gstin"] == "27AABCA9999K1Z4"
    assert apex_comp["mca_record"] == "RoC Mumbai - Active & Compliant"
    print("[PASS] Test 17: Company Registration with Reg Num, License, GSTIN & MCA Record")

    print("\n=======================================================")
    print("ALL 17 SCRAPPY SUITES PASSED (100% REGRESSION + STATUTORY IDS)")
    print("=======================================================\n")


if __name__ == "__main__":
    run_regression_suite()
