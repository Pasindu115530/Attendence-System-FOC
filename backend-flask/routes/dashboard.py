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
            # If student_id is provided, get their batch_year to filter subjects
            batch_year = None
            if student_id:
                cur.execute("SELECT batch_year FROM users WHERE index_number = %s", (student_id,))
                user_row = cur.fetchone()
                if user_row and user_row["batch_year"]:
                    batch_year = user_row["batch_year"]

            # Base query
            query = _LECTURE_QUERY

            # If we have a batch_year, we only want subjects assigned to this batch
            if batch_year:
                query += f" JOIN batch_subjects bs ON t.subject_id = bs.subject_id AND bs.batch_year = {int(batch_year)} "

            # Live lecture?
            cur.execute(
                query + "WHERE t.day_of_week = %s AND %s BETWEEN t.start_time AND t.end_time LIMIT 1",
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
                query + "WHERE t.day_of_week = %s AND t.start_time > %s ORDER BY t.start_time ASC LIMIT 1",
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
            lectures = []
            for r in cur.fetchall():
                lec = dict(r)
                if lec.get("start_time"): lec["start_time"] = str(lec["start_time"])
                if lec.get("end_time"): lec["end_time"] = str(lec["end_time"])
                lec["course_name"] = lec.get("subject_name")
                lectures.append(lec)
    return success({"lectures": lectures})
