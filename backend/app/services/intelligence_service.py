"""
Intelligence Service — automated process compatibility check,
capacity sanity checks, and processing benchmark validations.
"""

from app.models.company import Company
from app.models.listing import Listing
from app.models.material import Material


# Prototype benchmark ranges for the 3 prototype materials
PROCESSING_BENCHMARK_RANGES = {
    "textile": (250.0, 2000.0),       # Baling, sorting, shredding, garnetting
    "metal": (300.0, 3500.0),         # Shearing, baling, magnetic separation
    "chemical": (200.0, 1500.0),      # Drying, grinding, de-dusting (Fly ash)
}


def check_compatibility(
    listing: Listing,
    buyer_company: Company,
) -> dict:
    """Evaluate whether a material listing is compatible with a buyer's declared products and industry.

    PRD F2 requirements:
    - Compare material against buyer's verified industry & declared products.
    - Return 'suitable' (green) or 'not_suitable' (red) with explanatory reasons.
    """
    material: Material = listing.material
    if not material:
        return {
            "is_compatible": True,
            "badge": "suitable",
            "score": 1.0,
            "reasons": ["General industrial utility."],
        }

    import json

    # Parse compatible_industries
    raw_industries = material.compatible_industries
    if isinstance(raw_industries, str):
        try:
            compat_list = json.loads(raw_industries)
        except Exception:
            compat_list = [x.strip() for x in raw_industries.split(",") if x.strip()]
    elif isinstance(raw_industries, list):
        compat_list = raw_industries
    else:
        compat_list = []

    compatible_industries = [i.strip().lower() for i in compat_list]

    # Parse declared_products
    raw_products = buyer_company.declared_products
    if isinstance(raw_products, str):
        try:
            prod_list = json.loads(raw_products)
        except Exception:
            prod_list = [x.strip() for x in raw_products.split(",") if x.strip()]
    elif isinstance(raw_products, list):
        prod_list = raw_products
    else:
        prod_list = []

    buyer_industry = (buyer_company.industry or "").strip().lower()
    buyer_products = [p.strip().lower() for p in prod_list]

    reasons = []
    matches = 0

    # 1. Direct industry match
    industry_matched = False
    for ind in compatible_industries:
        if ind == buyer_industry or ind in buyer_industry:
            industry_matched = True
            matches += 2
            reasons.append(f"Direct sector alignment: Your industry '{buyer_company.industry}' is mapped for this material.")
            break

    # 2. Match against declared manufactured outputs
    product_matched = False
    for prod in buyer_products:
        # Check if product relates to the material or its compatible industries
        for ind in compatible_industries:
            # Common sub-string / keyword crossover (e.g. 'concrete', 'steel', 'pellet', 'aggregate', 'block')
            words = ind.split() + material.name.lower().split()
            if any(w in prod for w in words if len(w) > 3):
                product_matched = True
                matches += 1
                reasons.append(f"Manufacturing process synergy: Output '{prod}' typically utilizes {material.name}.")
                break
        if product_matched:
            break

    # Decision
    is_compatible = industry_matched or product_matched

    if not is_compatible:
        badge = "not_suitable"
        score = 0.2
        industries_str = ", ".join(compat_list) if compat_list else "other industries"
        reasons.append(
            f"No direct compatibility detected: '{material.name}' is primarily utilized by "
            f"[{industries_str}], which differs from your registered focus in {buyer_company.industry}."
        )
    else:
        badge = "suitable"
        score = min(1.0, 0.5 + (matches * 0.25))

    return {
        "is_compatible": is_compatible,
        "badge": badge,
        "score": score,
        "reasons": reasons,
    }


def verify_quantity_sanity(
    buyer_company: Company,
    requested_tons: float,
) -> dict:
    """Anti-hoarding and capacity sanity check (PRD Section 7).

    Prevents hoarding and buying more than can be used by comparing requested
    batch against annual permitted capacity.
    """
    annual_capacity = buyer_company.capacity_tons_per_year
    if not annual_capacity or annual_capacity <= 0:
        return {
            "is_sane": True,
            "percentage_of_annual": None,
            "warning": None,
        }

    pct = round((requested_tons / annual_capacity) * 100.0, 1)

    # If a single batch is > 25% of entire annual capacity, raise notice
    if pct > 25.0:
        return {
            "is_sane": False,
            "percentage_of_annual": pct,
            "warning": (
                f"Disproportionate order volume: {requested_tons} tons represents "
                f"{pct}% of your total annual registered manufacturing capacity ({annual_capacity} T/yr). "
                "Large batch orders are audited to prevent hoarding and unauthorized material leakage."
            ),
        }

    return {
        "is_sane": True,
        "percentage_of_annual": pct,
        "warning": None,
    }


def verify_processing_price(
    category: str,
    processing_cost_per_ton: float,
) -> dict:
    """Verify processing price against benchmark ranges (PRD F3.2 & F3.5)."""
    if processing_cost_per_ton <= 0:
        return {"is_valid": True, "is_outlier": False, "note": "Raw / unprocessed material"}

    cat_clean = category.lower().strip()
    low, high = PROCESSING_BENCHMARK_RANGES.get(cat_clean, (200.0, 3000.0))

    if processing_cost_per_ton > high * 1.5:
        return {
            "is_valid": True,
            "is_outlier": True,
            "note": f"Processing charge of ₹{processing_cost_per_ton}/T exceeds standard {cat_clean} benchmark (₹{low} - ₹{high}/T).",
        }

    return {
        "is_valid": True,
        "is_outlier": False,
        "note": f"Processing charge is within typical industry benchmark (₹{low} - ₹{high}/T).",
    }
