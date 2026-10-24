"""
Scrappy Prototype — One-command demo reset script.
Resets the SQLite database and seeds clean prototype enterprises,
the 3 prototype materials, active marketplace streams, inventory items,
order tracking milestones, and permanent trade history ledgers.
"""

import json
from datetime import datetime, timedelta, timezone

from app.database import Base, SessionLocal, engine
from app.models.company import Company
from app.models.inventory import InventoryItem
from app.models.listing import Listing
from app.models.material import Material
from app.models.notification import Notification
from app.models.order import Order
from app.models.trade import TradeHistory
from app.models.user import User
from app.utils.file_storage import ensure_upload_dir
from app.utils.security import hash_password


def reset_and_seed():
    print("Resetting Scrappy prototype database...")
    ensure_upload_dir()

    # Drop and recreate all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── 1. Prototype Materials (Exact 3) ─────────────────────────
        m_textile = Material(
            id=1,
            name="Textile waste",
            category="textile",
            description="Post-industrial textile trimmings, fabric cuttings, yarn waste, and spinning lint from mills.",
            hazard_class="non-hazardous",
            compatible_industries=json.dumps(["textile", "spinning", "recycled yarn", "nonwoven fabric", "paper", "insulation", "garments"]),
            is_active=True,
        )
        m_metal = Material(
            id=2,
            name="Metal scrap",
            category="metal",
            description="Ferrous and non-ferrous manufacturing scrap, cut pieces, turnings, and sheet metal off-cuts.",
            hazard_class="non-hazardous",
            compatible_industries=json.dumps(["steel", "foundry", "metal casting", "automotive", "machinery", "forging", "metallurgy"]),
            is_active=True,
        )
        m_flyash = Material(
            id=3,
            name="Fly ash",
            category="chemical",
            description="High-fineness coal combustion pozzolanic residue from thermal power generation.",
            hazard_class="low",
            compatible_industries=json.dumps(["cement", "construction", "brick making", "ready-mix concrete", "road building", "infrastructure"]),
            is_active=True,
        )

        db.add_all([m_textile, m_metal, m_flyash])
        db.flush()
        print("[OK] Created 3 prototype materials (Textile waste, Metal scrap, Fly ash)")

        # ── 2. Demo Enterprises (Single-login dual-capability) ────────
        c_greensteel = Company(
            id=1,
            name="GreenSteel Industries Pvt Ltd",
            industry="steel",
            company_reg_num="U27100MH2012PTC139882",
            company_license="FAC-MH-PUN-0842/2012",
            gstin="27AABCG1234F1Z5",
            mca_record="RoC Mumbai - Active & Compliant",
            declared_products=json.dumps(["TMT Rebars", "Billets", "Structural Beams"]),
            capacity_tons_per_year=75000.0,
            address="Plot 45, MIDC Bhosari Industrial Area",
            city="Pune",
            state="Maharashtra",
            pincode="411026",
            latitude=18.6279,
            longitude=73.8475,
            phone="+91-20-88776655",
            verification_status="verified",
            verified_at=datetime.now(timezone.utc),
            admin_notes="Auto-verified with factory license",
        )

        c_ecobuild = Company(
            id=2,
            name="EcoBuild Construction Co",
            industry="construction",
            company_reg_num="U45200GJ2016PTC091234",
            company_license="FAC-GJ-AHM-1120/2016",
            gstin="24AABCE5678K1Z2",
            mca_record="RoC Ahmedabad - Active & Compliant",
            declared_products=json.dumps(["Concrete Blocks", "Paving Stones", "Precast Slabs"]),
            capacity_tons_per_year=30000.0,
            address="Survey 112, GIDC Estate",
            city="Ahmedabad",
            state="Gujarat",
            pincode="382445",
            latitude=23.0225,
            longitude=72.5714,
            phone="+91-79-44556677",
            verification_status="verified",
            verified_at=datetime.now(timezone.utc),
            admin_notes="Auto-verified with GST registration",
        )

        c_textech = Company(
            id=3,
            name="TexTech Spinning & Weaving Mills",
            industry="textile",
            company_reg_num="U17110GJ2015PLC083419",
            company_license="FAC-GJ-SUR-3391/2015",
            gstin="24AABCT9012M1Z8",
            mca_record="RoC Ahmedabad - Active & Compliant",
            declared_products=json.dumps(["Cotton Yarn", "Denim Fabric", "Woven Apparels"]),
            capacity_tons_per_year=18000.0,
            address="Textile Park, Phase 2",
            city="Surat",
            state="Gujarat",
            pincode="395002",
            latitude=21.1702,
            longitude=72.8311,
            phone="+91-261-22334455",
            verification_status="verified",
            verified_at=datetime.now(timezone.utc),
            admin_notes="Auto-verified with factory license",
        )

        db.add_all([c_greensteel, c_ecobuild, c_textech])
        db.flush()

        # Users
        u1 = User(
            id=1,
            email="seller@greensteel.com",
            password_hash=hash_password("seller123"),
            full_name="Rajesh Verma (VP Supply Chain)",
            role="seller",
            company_id=c_greensteel.id,
            is_active=True,
        )
        u2 = User(
            id=2,
            email="buyer@ecobuild.com",
            password_hash=hash_password("buyer123"),
            full_name="Ananya Desai (Procurement Head)",
            role="buyer",
            company_id=c_ecobuild.id,
            is_active=True,
        )
        u3 = User(
            id=3,
            email="ops@textech.com",
            password_hash=hash_password("textech123"),
            full_name="Vikram Patel (Plant Operations)",
            role="seller",
            company_id=c_textech.id,
            is_active=True,
        )
        u_admin = User(
            id=4,
            email="admin@scrappy.com",
            password_hash=hash_password("admin123"),
            full_name="Platform Administrator",
            role="admin",
            company_id=None,
            is_active=True,
        )
        db.add_all([u1, u2, u3, u_admin])
        db.flush()
        print("[OK] Created 3 enterprise accounts (GreenSteel, EcoBuild, TexTech)")

        # ── 3. Seed Enterprise Inventory Items ────────────────────────
        inv_steel_1 = InventoryItem(
            id=1,
            company_id=c_greensteel.id,
            material_id=m_metal.id,
            material_name="Metal scrap",
            category="steel scrap",
            title="Heavy Melting Steel Scrap (HMS-1)",
            description="Structural steel off-cuts, channels, and heavy section plate trimmings.",
            quantity_tons=120.0,
            reserved_tons=40.0,
            actual_cost_per_ton=24000.0,
            is_processed=True,
            processing_details="Magnetic sorted, torch cut to 1m charging lengths",
            processed_cost_per_ton=1200.0,
            storage_location="Yard 3, Bhosari Facility",
            city="Pune",
            state="Maharashtra",
            pincode="411026",
            freight_rate_per_ton_km=3.5,
            estimated_tolls=500.0,
            status="in_stock",
            notes="Primary scrap reserve for secondary metallurgy",
        )
        inv_flyash_1 = InventoryItem(
            id=2,
            company_id=c_greensteel.id,
            material_id=m_flyash.id,
            material_name="Fly ash",
            category="fly ash",
            title="Captive Thermal Dry Fly Ash (Class F)",
            description="Fine dry fly ash extracted from electro-static precipitators.",
            quantity_tons=420.0,
            reserved_tons=30.0,
            actual_cost_per_ton=1600.0,
            is_processed=False,
            processing_details=None,
            processed_cost_per_ton=0.0,
            storage_location="Silo Block B",
            city="Pune",
            state="Maharashtra",
            pincode="411026",
            freight_rate_per_ton_km=3.5,
            estimated_tolls=1500.0,
            status="in_stock",
            notes="Continuous generation from captive power unit",
        )
        inv_textile_1 = InventoryItem(
            id=3,
            company_id=c_textech.id,
            material_id=m_textile.id,
            material_name="Textile waste",
            category="textile waste",
            title="Baled Cotton Yarn Waste & Spinning Lint",
            description="Sorted unbleached mill cut pieces and yarn waste, packaged in 200kg bales.",
            quantity_tons=60.0,
            reserved_tons=0.0,
            actual_cost_per_ton=35000.0,
            is_processed=True,
            processing_details="Hydraulically baled and dust-extracted",
            processed_cost_per_ton=1400.0,
            storage_location="Warehouse C, Textile Park",
            city="Surat",
            state="Gujarat",
            pincode="395002",
            freight_rate_per_ton_km=3.5,
            estimated_tolls=600.0,
            status="in_stock",
            notes="High cotton fiber purity >95%",
        )
        inv_eco_1 = InventoryItem(
            id=4,
            company_id=c_ecobuild.id,
            material_id=m_flyash.id,
            material_name="Fly ash",
            category="fly ash",
            title="Received Dry Fly Ash Stock",
            description="Procured pozzolanic ash for concrete block blending.",
            quantity_tons=50.0,
            reserved_tons=0.0,
            actual_cost_per_ton=1850.0,
            is_processed=False,
            processing_details=None,
            processed_cost_per_ton=0.0,
            storage_location="Inbound Ash Silo 1",
            city="Ahmedabad",
            state="Gujarat",
            pincode="382445",
            freight_rate_per_ton_km=3.5,
            estimated_tolls=0.0,
            status="in_stock",
            notes="Stocked from previous Scrappy trade settlement",
        )
        db.add_all([inv_steel_1, inv_flyash_1, inv_textile_1, inv_eco_1])
        db.flush()
        print("[OK] Created Enterprise Inventory Items across all demo accounts")

        # ── 4. Marketplace Streams ──────────────────────────────────
        l1 = Listing(
            id=1,
            company_id=c_greensteel.id,
            material_id=m_metal.id,
            category="scrap",
            title="Heavy Melting Metal Scrap (HMS-1 / HMS-2 Mix)",
            description="High-density structural cut pieces, punchings, and plate off-cuts. Cleaned, sheared, and magnetically sorted.",
            total_tons=80.0,
            remaining_tons=80.0,
            reserved_tons=0.0,
            price_per_ton=31500.0,
            min_price_floor=29000.0,
            min_order_tons=10.0,
            is_processed=True,
            processing_details="Magnetically sorted, sheared to 1m charging lengths",
            processing_cost_per_ton=1200.0,
            freight_rate_per_ton_km=3.5,
            toll_estimate=600.0,
            pickup_address="Plot 45, MIDC Bhosari",
            pickup_city="Pune",
            pickup_state="Maharashtra",
            pickup_pincode="411026",
            pickup_latitude=18.6279,
            pickup_longitude=73.8475,
            is_coming_soon=False,
            status="live",
        )

        l2 = Listing(
            id=2,
            company_id=c_greensteel.id,
            material_id=m_flyash.id,
            category="by_product",
            title="Class F Pozzolanic Dry Fly Ash",
            description="Consistently low unburnt carbon (<2.5%), high pozzolanic activity index. Sourced from captive thermal unit.",
            total_tons=420.0,
            remaining_tons=390.0,
            reserved_tons=0.0,
            price_per_ton=1850.0,
            min_price_floor=1600.0,
            min_order_tons=20.0,
            is_processed=False,
            processing_details=None,
            processing_cost_per_ton=0.0,
            freight_rate_per_ton_km=3.5,
            toll_estimate=1582.0,
            pickup_address="Plot 45, MIDC Bhosari",
            pickup_city="Pune",
            pickup_state="Maharashtra",
            pickup_pincode="411026",
            pickup_latitude=18.6279,
            pickup_longitude=73.8475,
            is_coming_soon=False,
            status="live",
        )

        l3 = Listing(
            id=3,
            company_id=c_textech.id,
            material_id=m_textile.id,
            category="leftover",
            title="Pure Combed Cotton Yarn & Fabric Cuttings",
            description="White and light shade cotton yarn waste and unbleached mill cut pieces. Low lint, baled.",
            total_tons=60.0,
            remaining_tons=60.0,
            reserved_tons=0.0,
            price_per_ton=39000.0,
            min_price_floor=36000.0,
            min_order_tons=5.0,
            is_processed=True,
            processing_details="Hydraulically baled and dust-extracted",
            processing_cost_per_ton=1400.0,
            freight_rate_per_ton_km=3.5,
            toll_estimate=600.0,
            pickup_address="Textile Park, Phase 2",
            pickup_city="Surat",
            pickup_state="Gujarat",
            pickup_pincode="395002",
            pickup_latitude=21.1702,
            pickup_longitude=72.8311,
            is_coming_soon=False,
            status="live",
        )

        l4 = Listing(
            id=4,
            company_id=c_greensteel.id,
            material_id=m_metal.id,
            category="scrap",
            title="Upcoming Furnace Maintenance Structural Metal Scrap",
            description="Clean heavy steel beams and machinery scrap expected from furnace re-lining shutdown.",
            total_tons=200.0,
            remaining_tons=200.0,
            reserved_tons=0.0,
            price_per_ton=29000.0,
            min_price_floor=27000.0,
            min_order_tons=15.0,
            is_processed=True,
            processing_details="Torch-cut to charge size",
            processing_cost_per_ton=1000.0,
            freight_rate_per_ton_km=3.5,
            toll_estimate=800.0,
            pickup_address="Plot 45, MIDC Bhosari",
            pickup_city="Pune",
            pickup_state="Maharashtra",
            pickup_pincode="411026",
            pickup_latitude=18.6279,
            pickup_longitude=73.8475,
            is_coming_soon=True,
            expected_available_date=datetime.now(timezone.utc) + timedelta(days=20),
            expected_tons=200.0,
            status="coming_soon",
        )

        db.add_all([l1, l2, l3, l4])
        db.flush()
        print("[OK] Created 4 marketplace listings (3 ready stock + 1 pre-book stream)")

        # ── 5. Orders & Tracking Milestones ─────────────────────────
        # Order 1: Approved, ready for dispatch (EcoBuild buys Fly Ash from GreenSteel)
        now = datetime.now(timezone.utc)
        tracking_milestones_o1 = [
            {
                "status": "pending",
                "title": "Order Placed",
                "location": "Ahmedabad, Gujarat",
                "notes": "Purchase request placed for 30 Tons Fly Ash.",
                "timestamp": (now - timedelta(days=2)).isoformat(),
            },
            {
                "status": "approved",
                "title": "Order Approved & Confirmed",
                "location": "Pune, Maharashtra",
                "notes": "Approved by GreenSteel. Collect from Gate 2 starting Monday 9 AM.",
                "timestamp": (now - timedelta(days=1)).isoformat(),
            },
        ]

        order1 = Order(
            id=1,
            order_number="PRG-DEMO-001",
            listing_id=l2.id,
            buyer_company_id=c_ecobuild.id,
            seller_company_id=c_greensteel.id,
            requested_tons=30.0,
            material_cost=55500.0,
            processing_cost=0.0,
            distance_km=632.9,
            freight_rate_per_ton_km=3.5,
            freight_cost=66454.5,
            toll_estimate=1582.25,
            total_landed_cost=123536.75,
            status="approved",
            buyer_notes="Need dispatch for ready-mix concrete plant next week",
            seller_notes="Approved. Collect from Gate 2 starting Monday 9 AM.",
            is_prebook=False,
            compatibility_override=False,
            tracking_history=json.dumps(tracking_milestones_o1),
        )

        # Order 2: Delivered & Completed Trade (EcoBuild bought 20 Tons of HMS Steel Scrap from GreenSteel)
        dispatch_time = now - timedelta(days=5)
        delivered_time = now - timedelta(days=3)
        tracking_milestones_o2 = [
            {
                "status": "pending",
                "title": "Order Placed",
                "location": "Ahmedabad, Gujarat",
                "notes": "Purchase request for structural HMS scrap.",
                "timestamp": (now - timedelta(days=6)).isoformat(),
            },
            {
                "status": "approved",
                "title": "Order Approved",
                "location": "Pune, Maharashtra",
                "notes": "Order approved for processing.",
                "timestamp": (now - timedelta(days=5, hours=12)).isoformat(),
            },
            {
                "status": "dispatched",
                "title": "Consignment Dispatched",
                "location": "Pune, Maharashtra",
                "notes": "Carrier: BlueDart Freight | Vehicle: MH-12-PQ-9081 | Driver: +91-9876543210",
                "timestamp": dispatch_time.isoformat(),
            },
            {
                "status": "in_transit",
                "title": "In Transit - Checkpoint Update",
                "location": "Surat Toll Plaza Highway NH48",
                "notes": "Consignment in transit, clearance completed.",
                "timestamp": (now - timedelta(days=4)).isoformat(),
            },
            {
                "status": "delivered",
                "title": "Delivered & Verified",
                "location": "Ahmedabad, Gujarat",
                "notes": "Delivered and accepted at EcoBuild Ahmedabad precast yard.",
                "timestamp": delivered_time.isoformat(),
            },
        ]

        order2 = Order(
            id=2,
            order_number="PRG-DEMO-002",
            listing_id=l1.id,
            buyer_company_id=c_ecobuild.id,
            seller_company_id=c_greensteel.id,
            requested_tons=20.0,
            material_cost=630000.0,
            processing_cost=24000.0,
            distance_km=632.9,
            freight_rate_per_ton_km=3.5,
            freight_cost=44303.0,
            toll_estimate=1582.0,
            total_landed_cost=699885.0,
            status="delivered",
            carrier_name="BlueDart Freight",
            vehicle_number="MH-12-PQ-9081",
            driver_phone="+91-9876543210",
            dispatch_date=dispatch_time,
            delivered_date=delivered_time,
            current_location="Delivered at Ahmedabad Facility",
            buyer_notes="Prompt delivery required for precast slab reinforcement",
            seller_notes="Dispatched via certified heavy hauler",
            is_prebook=False,
            compatibility_override=False,
            tracking_history=json.dumps(tracking_milestones_o2),
        )

        db.add_all([order1, order2])
        db.flush()

        # ── 6. Permanent Trade History (Recorded for BOTH Buyer & Seller) ──
        trade1 = TradeHistory(
            id=1,
            trade_number="TRD-261020-GS002",
            order_id=order2.id,
            buyer_company_id=c_ecobuild.id,
            seller_company_id=c_greensteel.id,
            listing_id=l1.id,
            material_id=m_metal.id,
            material_name="Metal scrap",
            category="steel scrap",
            listing_title="Heavy Melting Steel Scrap (HMS-1 / HMS-2 Mix)",
            traded_tons=20.0,
            material_cost=630000.0,
            processing_cost=24000.0,
            distance_km=632.9,
            freight_cost=44303.0,
            toll_cost=1582.0,
            total_landed_cost=699885.0,
            tracking_number="PRG-DEMO-002",
            carrier_name="BlueDart Freight",
            vehicle_number="MH-12-PQ-9081",
            dispatch_date=dispatch_time,
            delivery_date=delivered_time,
            carbon_offset_kg=30000.0,  # 20 tons * 1500 kg CO2 / ton saved
            status="completed",
            notes="Trade successfully finalized and recorded in both Buyer (EcoBuild) and Seller (GreenSteel) ledgers.",
        )
        db.add(trade1)

        # Initial Notification
        notif = Notification(
            id=1,
            company_id=c_ecobuild.id,
            title="Order Approved by Seller!",
            message="Your purchase order #PRG-DEMO-001 for 30 Tons of 'Class F Pozzolanic Dry Fly Ash' was approved by GreenSteel Industries.",
            type="order_approved",
            link="/orders",
            is_read=False,
        )

        db.add(notif)
        db.commit()
        print("[OK] Initialized approved sample trade & completed historical trade record")

        print("\n=======================================================")
        print("SCRAPPY PROTOTYPE DATABASE RESET & READY!")
        print("Accounts available:")
        print("  1. GreenSteel: seller@greensteel.com / seller123 (Pune, Steel)")
        print("  2. EcoBuild:   buyer@ecobuild.com   / buyer123  (Ahmedabad, Construction)")
        print("  3. TexTech:    ops@textech.com      / textech123 (Surat, Textile)")
        print("=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Reset failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed()
