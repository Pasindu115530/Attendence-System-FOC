from flask import Blueprint, request
from database.db import get_connection
from utils.response import success, error

report_bp = Blueprint("report", __name__)


@report_bp.post("/get_filtered_report")
def get_filtered_report():
    data = request.get_json(force=True, silent=True) or {}
    dept_id = data.get("dept_id")
    batch = data.get("batch")
    course_id = data.get("course_id")

    if not all([dept_id, batch, course_id]):
        return error("dept_id, batch, and course_id are all required")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.user_id, u.full_name,
                    (SELECT COUNT(*) FROM attendance att
                     WHERE att.user_id = u.user_id AND att.course_id = %s) AS attended_count,
                    (SELECT COUNT(*) FROM timetable tt
                     WHERE tt.course_id = %s AND tt.dept_id = %s)          AS total_sessions
                FROM users u
                WHERE u.role = 'Student' AND u.dept_id = %s AND u.batch_year = %s
                ORDER BY u.user_id ASC
                """,
                (course_id, course_id, dept_id, dept_id, batch),
            )
            rows = [dict(r) for r in cur.fetchall()]

    for row in rows:
        total = int(row["total_sessions"]) or 1
        attended = int(row["attended_count"])
        row["percentage"] = f"{round((attended / total) * 100, 1)}%"
        row["status"] = "Active" if attended > 0 else "No Data"

    return success({"report": rows})


@report_bp.post("/get_absent_records")
def get_absent_records():
    data = request.get_json(force=True, silent=True) or {}
    student_id = data.get("student_id", "").strip()

    if not student_id:
        return error("student_id is required")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.id, a.marked_at AS date, c.course_name
                FROM attendance a
                JOIN courses c ON a.course_id = c.id
                WHERE a.user_id = %s AND a.status = 'Absent'
                ORDER BY a.marked_at DESC
                """,
                (student_id,),
            )
            records = [dict(r) for r in cur.fetchall()]

    return success({"records": records})
