from database.db import get_connection
from services.geofence import determine_status
from utils.helpers import today_str


def already_marked(index_number: str, timetable_id: int) -> bool:
    """Return True if attendance has already been recorded today."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id FROM attendance
                WHERE index_number = %s
                  AND timetable_id = %s
                  AND DATE(marked_at) = %s
                LIMIT 1
                """,
                (index_number, timetable_id, today_str()),
            )
            return cur.fetchone() is not None


def fetch_geofence(timetable_id: int) -> dict | None:
    """Fetch the classroom geofence coordinates for a given timetable slot."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.lat_a, r.lon_a, r.lat_b, r.lon_b,
                       r.lat_c, r.lon_c, r.lat_d, r.lon_d
                FROM timetable t
                JOIN classrooms r ON t.classroom_id = r.id
                WHERE t.id = %s
                LIMIT 1
                """,
                (timetable_id,),
            )
            return cur.fetchone()


def record_attendance(
    index_number: str,
    subject_id: int,
    timetable_id: int,
    latitude: float,
    longitude: float,
    status: str,
) -> bool:
    """Insert a new attendance row and return True on success."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO attendance
                    (index_number, subject_id, timetable_id, lat_at_mark, lon_at_mark, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (index_number, subject_id, timetable_id, latitude, longitude, status),
            )
        conn.commit()
    return True


def process_mark_attendance(payload: dict) -> dict:
    """
    Orchestrate the full mark-attendance flow:
      1. Duplicate guard
      2. Geofence lookup & status determination
      3. DB insert
    Returns a result dict with keys: ok, message, attendance_status, distance
    """
    index_number = payload["index_number"]
    timetable_id = int(payload["timetable_id"])
    subject_id = int(payload["subject_id"])
    lat = float(payload["latitude"])
    lon = float(payload["longitude"])

    if already_marked(index_number, timetable_id):
        return {"ok": False, "message": "Already marked for today"}

    geo = fetch_geofence(timetable_id)
    distance = None
    status = "Absent"

    if geo and geo.get("lat_a") is not None:
        status, distance = determine_status(lat, lon, geo)

    record_attendance(index_number, subject_id, timetable_id, lat, lon, status)

    return {
        "ok": True,
        "message": f"Attendance marked as {status}",
        "attendance_status": status,
        "distance": f"{round(distance, 2)}m" if distance is not None else "N/A",
    }
