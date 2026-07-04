from flask import Blueprint, request
from database.db import get_connection
from utils.response import success, error

report_bp = Blueprint("report", __name__)


@report_bp.post("/get_filtered_report")
def get_filtered_report():
    data = request.get_json(force=True, silent=True) or {}
    department_id = data.get("department_id") or data.get("dept_id")
    batch = data.get("batch")
    subject_id = data.get("subject_id") or data.get("course_id")

    if not all([department_id, batch, subject_id]):
        return error("department_id, batch, and subject_id are all required")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.index_number AS user_id, u.full_name,
                    (SELECT COUNT(*) FROM attendance att
                     WHERE att.index_number = u.index_number AND att.subject_id = %s) AS attended_count,
                    (SELECT COUNT(*) FROM timetable tt
                     WHERE tt.subject_id = %s) AS total_sessions
                FROM users u
                WHERE u.role = 'Student' AND u.department_id = %s AND u.batch_year = %s
                ORDER BY u.index_number ASC
                """,
                (subject_id, subject_id, department_id, batch),
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
    index_number = data.get("index_number") or data.get("student_id", "").strip()

    if not index_number:
        return error("index_number is required")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.id, a.marked_at AS date, s.subject_name AS course_name, a.medical_report
                FROM attendance a
                JOIN subjects s ON a.subject_id = s.id
                WHERE a.index_number = %s AND a.status = 'Absent'
                ORDER BY a.marked_at DESC
                """,
                (index_number,),
            )
            records = [dict(r) for r in cur.fetchall()]

            if not records:
                cur.execute(
                    """
                    SELECT a.id, a.marked_at AS date, s.subject_name AS course_name, a.medical_report
                    FROM attendance a
                    JOIN subjects s ON a.subject_id = s.id
                    WHERE a.index_number = %s
                    ORDER BY a.marked_at DESC
                    LIMIT 10
                    """,
                    (index_number,),
                )
                records = [dict(r) for r in cur.fetchall()]

    for r in records:
        if r.get("date"):
            r["date"] = str(r["date"])

    return success({"records": records})
