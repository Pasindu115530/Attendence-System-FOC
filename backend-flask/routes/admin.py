from flask import Blueprint, request
from database.db import get_connection
from utils.response import success, error
import pandas as pd
import io

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


@admin_bp.post("/add_student")
def add_student():
    data = request.get_json(force=True, silent=True) or {}
    user_id = data.get("user_id") or data.get("index_number")
    registration_number = data.get("registration_number")
    full_name = data.get("full_name")
    nic = data.get("nic")
    dept_id = data.get("dept_id") or data.get("department_id")
    batch_year = data.get("batch_year")

    if not all([user_id, registration_number, full_name, nic]):
        return error("user_id, registration_number, full_name, and nic are required")

    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    INSERT INTO users (index_number, registration_number, full_name, nic, password, role, department_id, batch_year)
                    VALUES (%s, %s, %s, %s, %s, 'Student', %s, %s)
                    """,
                    (user_id, registration_number, full_name, nic, nic, dept_id, batch_year),
                )
                conn.commit()
            except Exception as e:
                conn.rollback()
                return error(str(e))
    return success({"message": "Student added successfully"})


@admin_bp.post("/upload_students")
def upload_students():
    if "file" not in request.files:
        return error("No file provided")
    file = request.files["file"]
    if file.filename == "":
        return error("No file selected")
    
    try:
        df = pd.read_excel(file)
        
        # We need index_number, full_name, nic, department_id, batch_year
        # Handle cases where column names might be slightly different
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        required_cols = ['index_number', 'full_name', 'nic']
        for c in required_cols:
            if c not in df.columns:
                # Try fallback names
                if c == 'index_number' and 'user_id' in df.columns:
                    df = df.rename(columns={'user_id': 'index_number'})
                else:
                    return error(f"Missing required column: {c}")
                    
        dept_col = 'department_id' if 'department_id' in df.columns else ('dept_id' if 'dept_id' in df.columns else None)
        batch_col = 'batch_year' if 'batch_year' in df.columns else None
        
        # Look for a registration number column, otherwise fallback to user_id
        reg_col = None
        for col in ['registration_number', 'reg_no', 'reg_number', 'registration number']:
            if col in df.columns:
                reg_col = col
                break

        added_count = 0
        with get_connection() as conn:
            with conn.cursor() as cur:
                for _, row in df.iterrows():
                    user_id = str(row['index_number']).strip()
                    full_name = str(row['full_name']).strip()
                    nic = str(row['nic']).strip()
                    dept_id = str(row[dept_col]).strip() if dept_col and pd.notna(row[dept_col]) else None
                    if dept_id and dept_id.lower() == 'nan': dept_id = None
                    batch_year = int(row[batch_col]) if batch_col and pd.notna(row[batch_col]) else None
                    
                    registration_number = str(row[reg_col]).strip() if reg_col and pd.notna(row[reg_col]) else user_id

                    if user_id and full_name and nic:
                        try:
                            cur.execute(
                                """
                                INSERT INTO users (index_number, registration_number, full_name, nic, password, role, department_id, batch_year)
                                VALUES (%s, %s, %s, %s, %s, 'Student', %s, %s)
                                ON CONFLICT (index_number) DO NOTHING
                                """,
                                (user_id, registration_number, full_name, nic, nic, dept_id, batch_year),
                            )
                            added_count += cur.rowcount
                        except Exception as e:
                            print(f"Error inserting {user_id}: {e}")
                            conn.rollback()
                            continue
            conn.commit()
            
        return success({"message": f"{added_count} students uploaded successfully"})
    except Exception as e:
        return error(str(e))


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

@admin_bp.post("/get_batch_subjects")
def get_batch_subjects():
    data = request.get_json(force=True, silent=True) or {}
    batch_year = data.get("batch_year")
    department_id = data.get("department_id")

    if not batch_year or not department_id:
        return error("batch_year and department_id are required")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.subject_code, s.subject_name
                FROM subjects s
                WHERE s.department_id = %s
                ORDER BY s.subject_name ASC
                """,
                (department_id,)
            )
            all_subjects = [dict(r) for r in cur.fetchall()]

            cur.execute(
                """
                SELECT subject_id 
                FROM batch_subjects 
                WHERE batch_year = %s
                """,
                (batch_year,)
            )
            assigned = {r["subject_id"] for r in cur.fetchall()}

    for s in all_subjects:
        s["assigned"] = s["id"] in assigned

    return success({"subjects": all_subjects})


@admin_bp.post("/assign_batch_subjects")
def assign_batch_subjects():
    data = request.get_json(force=True, silent=True) or {}
    batch_year = data.get("batch_year")
    department_id = data.get("department_id")
    subject_ids = data.get("subject_ids", [])

    if not batch_year or not department_id:
        return error("batch_year and department_id are required")

    with get_connection() as conn:
        with conn.cursor() as cur:
            # First, delete all currently assigned subjects for this batch and department
            # Since batch_subjects doesn't have department_id, we join with subjects
            cur.execute(
                """
                DELETE FROM batch_subjects
                WHERE batch_year = %s 
                AND subject_id IN (
                    SELECT id FROM subjects WHERE department_id = %s
                )
                """,
                (batch_year, department_id)
            )

            # Insert new subjects
            if subject_ids:
                args = [(batch_year, sid) for sid in subject_ids]
                args_str = ",".join(["(%s, %s)"] * len(subject_ids))
                flat_args = [item for pair in args for item in pair]
                
                cur.execute(
                    f"""
                    INSERT INTO batch_subjects (batch_year, subject_id)
                    VALUES {args_str}
                    ON CONFLICT DO NOTHING
                    """,
                    flat_args
                )
        conn.commit()

    return success({"message": "Subjects assigned successfully"})


@admin_bp.post("/reset_semester")
def reset_semester():
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Delete attendance first due to foreign key constraints on timetable
            cur.execute("DELETE FROM attendance")
            # Delete all scheduled classes
            cur.execute("DELETE FROM timetable")
            # Delete all batch subject assignments
            cur.execute("DELETE FROM batch_subjects")
        conn.commit()

    return success({"message": "Semester data has been completely reset."})
