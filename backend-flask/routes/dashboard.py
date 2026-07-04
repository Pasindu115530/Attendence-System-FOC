from flask import Blueprint, request
from database.db import get_connection
from utils.helpers import current_day_name, current_time_str, today_str
from utils.response import success

dashboard_bp = Blueprint("dashboard", __name__)

_LECTURE_QUERY = """
    SELECT t.*, s.subject_name, s.subject_code, r.room_name
    FROM timetable t
    JOIN subjects s ON t.subject_id = s.id
    JOIN classrooms r ON t.classroom_id = r.id
"""


@dashboard_bp.post("/get_dashboard")
def get_dashboard():
    data = request.get_json(force=True, silent=True) or {}
    student_id = data.get("index_number", "")
    day = current_day_name()
    time_now = current_time_str()
    today = today_str()

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Live lecture?
            cur.execute(
                _LECTURE_QUERY
                + "WHERE t.day_of_week = %s AND %s BETWEEN t.start_time AND t.end_time LIMIT 1",
                (day, time_now),
            )
            lecture = cur.fetchone()

            if lecture:
                lecture = dict(lecture)
                lecture["isLive"] = True
                # Alias subject_name to course_name so UI doesn't completely break before we patch it
                lecture["course_name"] = lecture["subject_name"] 
                lecture["course_id"] = lecture["subject_id"]
                if student_id:
                    cur.execute(
                        """
                        SELECT id FROM attendance
                        WHERE index_number = %s AND timetable_id = %s AND DATE(marked_at) = %s
                        LIMIT 1
                        """,
                        (student_id, lecture["id"], today),
                    )
                    lecture["hasMarked"] = cur.fetchone() is not None
                else:
                    lecture["hasMarked"] = False
                return success({"lecture": lecture})

            # Next upcoming lecture today
            cur.execute(
                _LECTURE_QUERY
                + "WHERE t.day_of_week = %s AND t.start_time > %s ORDER BY t.start_time ASC LIMIT 1",
                (day, time_now),
            )
            next_lecture = cur.fetchone()

    if next_lecture:
        next_lecture = dict(next_lecture)
        next_lecture["isLive"] = False
        next_lecture["course_name"] = next_lecture["subject_name"]
        next_lecture["course_id"] = next_lecture["subject_id"]
        return success({"lecture": next_lecture})

    return success({"lecture": None, "message": "No more lectures today"})


@dashboard_bp.post("/get_admin_dashboard")
def get_admin_dashboard():
    day = current_day_name()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                _LECTURE_QUERY + "WHERE t.day_of_week = %s ORDER BY t.start_time ASC",
                (day,),
            )
            lectures = [dict(r) for r in cur.fetchall()]
    return success({"lectures": lectures})
