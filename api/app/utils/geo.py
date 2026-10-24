"""
Geolocation and distance calculation utilities.
Uses Haversine formula to calculate overland distance between plants.
"""

import math

# City coordinate lookups for India if lat/lng are missing
CITY_COORDINATES = {
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "ahmedabad": (23.0225, 72.5714),
    "hyderabad": (17.3850, 78.4867),
    "delhi": (28.7041, 77.1025),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "surat": (21.1702, 72.8311),
    "nagpur": (21.1458, 79.0882),
    "vadodara": (22.3072, 73.1812),
    "indore": (22.7196, 75.8577),
    "visakhapatnam": (17.6868, 83.2185),
    "coimbatore": (11.0168, 76.9558),
    "jaipur": (26.9124, 75.7873),
    "jamshedpur": (22.8046, 86.2029),
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in km."""
    R = 6371.0  # Earth radius in kilometers

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    # Overland road factor ~ 1.25x straight-line
    return round(distance * 1.25, 1)


def get_coordinates_for_city(city_name: str | None) -> tuple[float, float]:
    """Fallback city coordinates lookup."""
    if not city_name:
        return (19.0760, 72.8777)  # default Mumbai
    clean_city = city_name.strip().lower()
    return CITY_COORDINATES.get(clean_city, (19.0760, 72.8777))
