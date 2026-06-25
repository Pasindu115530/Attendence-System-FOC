import math


def is_point_in_polygon(lat: float, lon: float, polygon: list[dict]) -> bool:
    """
    Ray-casting algorithm to determine whether (lat, lon) falls
    inside the given polygon.

    polygon: list of dicts with keys 'lat' and 'lon', forming a closed ring.
    """
    inside = False
    n = len(polygon)
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]["lat"], polygon[i]["lon"]
        xj, yj = polygon[j]["lat"], polygon[j]["lon"]
        intersect = ((yi > lon) != (yj > lon)) and (
            lat < (xj - xi) * (lon - yi) / (yj - yi) + xi
        )
        if intersect:
            inside = not inside
        j = i
    return inside


def get_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Haversine formula — returns the distance in metres between two
    geographic coordinates.
    """
    earth_radius = 6_371_000  # metres
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius * c


def build_polygon_from_geo(geo: dict) -> list[dict]:
    """
    Convert a flat geo dict (lat_a/lon_a … lat_d/lon_d) from the
    classrooms table into the list-of-dicts format expected by
    is_point_in_polygon().
    """
    return [
        {"lat": float(geo["lat_a"]), "lon": float(geo["lon_a"])},
        {"lat": float(geo["lat_b"]), "lon": float(geo["lon_b"])},
        {"lat": float(geo["lat_c"]), "lon": float(geo["lon_c"])},
        {"lat": float(geo["lat_d"]), "lon": float(geo["lon_d"])},
    ]


def determine_status(
    student_lat: float,
    student_lon: float,
    geo: dict,
    buffer_metres: float = 10.0,
) -> tuple[str, float]:
    """
    Return ('Present'|'Absent', distance_in_metres).

    Uses two complementary checks:
      A) Ray-casting — is the point strictly inside the classroom polygon?
      B) Centroid fallback — is the point within *buffer_metres* of the
         polygon's bounding-box centre? (handles GPS drift near edges)
    """
    polygon = build_polygon_from_geo(geo)

    center_lat = (float(geo["lat_a"]) + float(geo["lat_c"])) / 2
    center_lon = (float(geo["lon_a"]) + float(geo["lon_c"])) / 2

    distance = get_distance(student_lat, student_lon, center_lat, center_lon)
    in_polygon = is_point_in_polygon(student_lat, student_lon, polygon)

    status = "Present" if (in_polygon or distance <= buffer_metres) else "Absent"
    return status, distance
