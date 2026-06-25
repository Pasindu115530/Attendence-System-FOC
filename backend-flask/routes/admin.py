from flask import Blueprint, request
from database.db import get_connection
from utils.response import success, error

admin_bp = Blueprint("admin", __name__)


@admin_bp.post("/get_departments")
def get_departments():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT dept_id FROM timetable ORDER BY dept_id ASC")
            depts = [dict(r) for r in cur.fetchall()]
    return success({"departments": depts})


@admin_bp.post("/get_batches")
def get_batches():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT batch_year FROM users
                WHERE role = 'Student' AND batch_year IS NOT NULL
                ORDER BY batch_year DESC
                """
            )
            batches = [dict(r) for r in cur.fetchall()]
    return success({"batches": batches})


@admin_bp.post("/get_courses")
def get_courses():
    data = request.get_json(force=True, silent=True) or {}
    dept_id = data.get("dept_id", "")

    with get_connection() as conn:
        with conn.cursor() as cur:
            if dept_id:
                cur.execute(
                    """
                    SELECT DISTINCT c.id, c.course_name
                    FROM courses c
                    JOIN timetable t ON c.id = t.course_id
                    WHERE t.dept_id = %s
                    ORDER BY c.course_name ASC
                    """,
                    (dept_id,),
                )
            else:
                cur.execute("SELECT id, course_name FROM courses ORDER BY course_name ASC")
            courses = [dict(r) for r in cur.fetchall()]
    return success({"courses": courses})


@admin_bp.post("/get_all_students")
def get_all_students():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, full_name, nic, role, dept_id, batch_year
                FROM users WHERE role = 'Student' ORDER BY user_id ASC
                """
            )
            students = [dict(r) for r in cur.fetchall()]
    return success({"students": students})


@admin_bp.post("/get_all_classrooms")
def get_all_classrooms():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM classrooms ORDER BY room_name ASC")
            rooms = [dict(r) for r in cur.fetchall()]
    return success({"classrooms": rooms})


@admin_bp.post("/get_all_courses")
def get_all_courses():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM courses ORDER BY course_name ASC")
            courses = [dict(r) for r in cur.fetchall()]
    return success({"courses": courses})


@admin_bp.post("/add_timetable")
def add_timetable():
    data = request.get_json(force=True, silent=True) or {}
    required = ("course_id", "classroom_id", "day_of_week", "start_time", "end_time", "dept_id")
    if any(not data.get(k) for k in required):
        return error("Missing required fields: " + ", ".join(required))

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO timetable (course_id, classroom_id, day_of_week, start_time, end_time, dept_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    data["course_id"],
                    data["classroom_id"],
                    data["day_of_week"],
                    data["start_time"],
                    data["end_time"],
                    data["dept_id"],
                ),
            )
        conn.commit()
    return success({"message": "Timetable entry added"})


@admin_bp.post("/update_geofence")
def update_geofence():
    data = request.get_json(force=True, silent=True) or {}
    room_name = data.get("room_name", "").strip()
    if not room_name:
        return error("room_name is required")

    geo_fields = ("lat_a", "lon_a", "lat_b", "lon_b", "lat_c", "lon_c", "lat_d", "lon_d")
    if any(data.get(f) is None for f in geo_fields):
        return error("All 8 geofence coordinate fields are required")

    coords = {f: data[f] for f in geo_fields}

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM classrooms WHERE room_name = %s LIMIT 1", (room_name,)
            )
            room = cur.fetchone()

            if room:
                cur.execute(
                    """
                    UPDATE classrooms
                    SET lat_a=%s, lon_a=%s, lat_b=%s, lon_b=%s,
                        lat_c=%s, lon_c=%s, lat_d=%s, lon_d=%s
                    WHERE id=%s
                    """,
                    (*coords.values(), room["id"]),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO classrooms
                        (room_name, lat_a, lon_a, lat_b, lon_b, lat_c, lon_c, lat_d, lon_d)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (room_name, *coords.values()),
                )
        conn.commit()
    return success({"message": "Geofence updated"})
