"""
Seed script — populates the database with an admin user, ~15 materials,
and 2-3 demo companies with associated users.

Usage:
    cd backend
    python seed.py
"""

import json
import sys
from pathlib import Path

# Ensure the backend directory is on the path so `app` can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import Base, SessionLocal, engine
from app.models.company import Company
from app.models.material import Material
from app.models.user import User
from app.utils.security import hash_password


def seed():
    """Create all tables and insert seed data."""

    print("Creating database tables …")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── 2. Admin user ───────────────────────────────────────────
        if not db.query(User).filter(User.email == "admin@scrappy.com").first():
            admin = User(
                email="admin@scrappy.com",
                password_hash=hash_password("admin123"),
                full_name="Scrappy Admin",
                role="admin",
                company_id=None,
                is_active=True,
            )
            db.add(admin)
            db.flush()
            print("✓ Admin user created (admin@scrappy.com / admin123)")
        else:
            print("· Admin user already exists — skipped")

        # ── 3. Prototype Materials catalog (Exact 3 materials) ──────────
        materials_data = [
            {
                "name": "Textile waste",
                "category": "textile",
                "description": "Post-industrial textile trimmings, fabric cuttings, yarn waste, and spinning lint from mills",
                "hazard_class": "non-hazardous",
                "compatible_industries": ["textile", "spinning", "recycled yarn", "nonwoven fabric", "paper", "insulation", "garments"],
            },
            {
                "name": "Metal scrap",
                "category": "metal",
                "description": "Ferrous and non-ferrous manufacturing scrap, cut pieces, turnings, and sheet metal off-cuts",
                "hazard_class": "non-hazardous",
                "compatible_industries": ["steel", "foundry", "metal casting", "automotive", "machinery", "forging", "metallurgy"],
            },
            {
                "name": "Fly ash",
                "category": "chemical",
                "description": "High-fineness coal combustion pozzolanic residue from thermal power generation",
                "hazard_class": "low",
                "compatible_industries": ["cement", "construction", "brick making", "ready-mix concrete", "road building", "infrastructure"],
            },
        ]

        created_count = 0
        for m in materials_data:
            if not db.query(Material).filter(Material.name == m["name"]).first():
                material = Material(
                    name=m["name"],
                    category=m["category"],
                    description=m["description"],
                    hazard_class=m["hazard_class"],
                    compatible_industries=json.dumps(m["compatible_industries"]),
                )
                db.add(material)
                created_count += 1
        db.flush()
        print(f"✓ {created_count} materials created ({len(materials_data) - created_count} already existed)")

        # ── 4. Demo companies and users ─────────────────────────────
        demo_companies = [
            {
                "company": {
                    "name": "GreenSteel Industries Pvt Ltd",
                    "industry": "steel",
                    "company_reg_num": "U27100MH2012PTC139882",
                    "company_license": "FAC-MH-PUN-0842/2012",
                    "gstin": "27AABCG1234F1Z5",
                    "mca_record": "RoC Mumbai - Active & Compliant",
                    "declared_products": json.dumps(["Steel Billets", "TMT Bars"]),
                    "capacity_tons_per_year": 50000,
                    "address": "Plot 45, MIDC Industrial Area",
                    "city": "Pune",
                    "state": "Maharashtra",
                    "pincode": "411039",
                    "phone": "+91-20-12345678",
                    "verification_status": "verified",
                },
                "user": {
                    "email": "seller@greensteel.com",
                    "password": "seller123",
                    "full_name": "Rajesh Sharma",
                    "role": "seller",
                },
            },
            {
                "company": {
                    "name": "EcoBuild Construction Co",
                    "industry": "construction",
                    "company_reg_num": "U45200GJ2016PTC091234",
                    "company_license": "FAC-GJ-AHM-1120/2016",
                    "gstin": "24AABCE5678K1Z2",
                    "mca_record": "RoC Ahmedabad - Active & Compliant",
                    "declared_products": json.dumps(["Concrete Blocks", "Paving Stones"]),
                    "capacity_tons_per_year": 20000,
                    "address": "Survey No. 112, Industrial Estate",
                    "city": "Ahmedabad",
                    "state": "Gujarat",
                    "pincode": "382445",
                    "phone": "+91-79-87654321",
                    "verification_status": "verified",
                },
                "user": {
                    "email": "buyer@ecobuild.com",
                    "password": "buyer1234",
                    "full_name": "Priya Patel",
                    "role": "buyer",
                },
            },
            {
                "company": {
                    "name": "BioEnergy Solutions",
                    "industry": "biomass energy",
                    "company_reg_num": "U40106TG2019PTC118942",
                    "company_license": "FAC-TG-HYD-5501/2019",
                    "gstin": "36AABCB4321L1Z9",
                    "mca_record": "RoC Hyderabad - Active & Compliant",
                    "declared_products": json.dumps(["Biomass Pellets", "Briquettes"]),
                    "capacity_tons_per_year": 10000,
                    "address": "Unit 7, Green Park",
                    "city": "Hyderabad",
                    "state": "Telangana",
                    "pincode": "500032",
                    "phone": "+91-40-55667788",
                    "verification_status": "pending",
                },
                "user": {
                    "email": "ops@bioenergy.com",
                    "password": "bioenergy1",
                    "full_name": "Arun Kumar",
                    "role": "buyer",
                },
            },
        ]

        for demo in demo_companies:
            if not db.query(User).filter(User.email == demo["user"]["email"]).first():
                company = Company(**demo["company"])
                db.add(company)
                db.flush()

                user = User(
                    email=demo["user"]["email"],
                    password_hash=hash_password(demo["user"]["password"]),
                    full_name=demo["user"]["full_name"],
                    role=demo["user"]["role"],
                    company_id=company.id,
                )
                db.add(user)
                print(f"✓ Demo company '{demo['company']['name']}' + user '{demo['user']['email']}' created")
            else:
                print(f"· Demo user '{demo['user']['email']}' already exists — skipped")

        db.commit()
        print("\n✅ Seed complete!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
