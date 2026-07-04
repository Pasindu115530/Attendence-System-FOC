from flask import Blueprint, request
from database.db import get_connection
from utils.response import success, error

admin_bp = Blueprint("admin", __name__)


@admin_bp.post("/get_departments")
def get_departments():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name FROM departments ORDER BY id ASC")
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
    department_id = data.get("department_id") or data.get("dept_id")

    with get_connection() as conn:
        with conn.cursor() as cur:
            if department_id:
                cur.execute(
                    """
                    SELECT id AS course_id, subject_name AS course_name, subject_code
                    FROM subjects
                    WHERE department_id = %s
                    ORDER BY subject_name ASC
                    """,
                    (department_id,),
                )
            else:
                cur.execute("SELECT id AS course_id, subject_name AS course_name, subject_code FROM subjects ORDER BY subject_name ASC")
            courses = [dict(r) for r in cur.fetchall()]
    return success({"courses": courses})


@admin_bp.post("/get_all_students")
def get_all_students():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT index_number AS user_id, registration_number, full_name, nic, role, department_id, batch_year
                FROM users WHERE role = 'Student' ORDER BY index_number ASC
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
            cur.execute("SELECT id AS course_id, subject_name AS course_name, subject_code, department_id, batch_year FROM subjects ORDER BY subject_name ASC")
            courses = [dict(r) for r in cur.fetchall()]
    return success({"courses": courses})


@admin_bp.post("/add_timetable")
def add_timetable():
    data = request.get_json(force=True, silent=True) or {}
    
    course_id = data.get("subject_id") or data.get("course_id")
    classroom_id = data.get("classroom_id")
    day_of_week = data.get("day_of_week")
    start_time = data.get("start_time")
    end_time = data.get("end_time")

    if not all([course_id, classroom_id, day_of_week, start_time, end_time]):
        return error("Missing required fields")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO timetable (subject_id, classroom_id, day_of_week, start_time, end_time)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    course_id,
                    classroom_id,
                    day_of_week,
                    start_time,
                    end_time,
                ),
            )
        conn.commit()
    return success({"message": "Timetable entry added"})


@admin_bp.post("/get_all_timetable")
def get_all_timetable():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT t.id, t.subject_id AS course_id, t.classroom_id, t.day_of_week, t.start_time, t.end_time,
                       s.subject_name AS course_name, s.department_id, r.room_name
                FROM timetable t
                JOIN subjects s ON t.subject_id = s.id
                JOIN classrooms r ON t.classroom_id = r.id
                ORDER BY CASE t.day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                    WHEN 'Saturday' THEN 6
                    WHEN 'Sunday' THEN 7
                    ELSE 8
                END, t.start_time ASC
                """
            )
            slots = [dict(r) for r in cur.fetchall()]
    for s in slots:
        if s.get("start_time"):
            s["start_time"] = str(s["start_time"])
        if s.get("end_time"):
            s["end_time"] = str(s["end_time"])
    return success({"timetable": slots})


@admin_bp.post("/delete_timetable")
def delete_timetable():
    data = request.get_json(force=True, silent=True) or {}
    slot_id = data.get("slot_id")
    if not slot_id:
        return error("slot_id is required")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM timetable WHERE id = %s", (slot_id,))
        conn.commit()
    return success({"message": "Timetable slot deleted"})



@admin_bp.post("/update_geofence")
def update_geofence():
    data = request.get_json(force=True, silent=True) or {}
    room_name = data.get("room_name", "").strip()
    seat_count = data.get("seat_count", 0)
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
                    SET seat_count=%s, lat_a=%s, lon_a=%s, lat_b=%s, lon_b=%s,
                        lat_c=%s, lon_c=%s, lat_d=%s, lon_d=%s
                    WHERE id=%s
                    """,
                    (seat_count, *coords.values(), room["id"]),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO classrooms
                        (room_name, seat_count, lat_a, lon_a, lat_b, lon_b, lat_c, lon_c, lat_d, lon_d)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (room_name, seat_count, *coords.values()),
                )
        conn.commit()
    return success({"message": "Geofence updated"})
