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

    day_map = {
        "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
        "Friday": 4, "Saturday": 5, "Sunday": 6
    }
    current_day_idx = day_map.get(day, 0)
    # Build ordered list of days starting from today, max 7 days ahead
    ordered_days = [
        list(day_map.keys())[(current_day_idx + i) % 7]
        for i in range(7)
    ]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Get batch_year and department_id for filtering
                batch_year = None
                department_id = None
                if student_id:
                    cur.execute("SELECT batch_year, department_id FROM users WHERE index_number = %s", (student_id,))
                    user_row = cur.fetchone()
                    if user_row:
                        batch_year = user_row.get("batch_year")
                        department_id = user_row.get("department_id")

                # Base query
                query = _LECTURE_QUERY
                params = []

                if batch_year:
                    query += " JOIN batch_subjects bs ON t.subject_id = bs.subject_id AND bs.batch_year = %s "
                    params.append(int(batch_year))

                query += " WHERE 1=1 "
                if department_id:
                    query += " AND s.department_id = %s "
                    params.append(department_id)

                # Fetch only the current week's lectures using IN clause (indexed)
                placeholders = ",".join(["%s"] * len(ordered_days))
                query += f" AND t.day_of_week IN ({placeholders}) ORDER BY t.day_of_week, t.start_time ASC"
                params.extend(ordered_days)

                cur.execute(query, tuple(params))
                all_rows = cur.fetchall()

                valid_lectures = []
                for r in all_rows:
                    lec = dict(r)
                    lec_day_idx = day_map.get(lec.get("day_of_week", ""), 0)
                    lec_start = str(lec.get("start_time", ""))
                    lec_end = str(lec.get("end_time", ""))

                    days_until = (lec_day_idx - current_day_idx + 7) % 7
                    # If it's today but already over, push to next week
                    if days_until == 0 and lec_end < time_now:
                        days_until = 7

                    lec["days_until"] = days_until
                    valid_lectures.append(lec)

                valid_lectures.sort(key=lambda x: (x["days_until"], str(x["start_time"])))

                lectures = []
                for lec in valid_lectures[:10]:  # Cap at 10 upcoming lectures
                    lec["start_time"] = str(lec["start_time"])
                    lec["end_time"] = str(lec["end_time"])
                    lec["course_name"] = lec.get("subject_name")
                    lec["course_id"] = lec["subject_id"]

                    is_live = (lec["days_until"] == 0) and (lec["start_time"] <= time_now <= lec["end_time"])
                    lec["isLive"] = is_live

                    if is_live and student_id:
                        cur.execute(
                            """
                            SELECT id FROM attendance
                            WHERE index_number = %s AND timetable_id = %s AND DATE(marked_at) = %s
                            LIMIT 1
                            """,
                            (student_id, lec["id"], today),
                        )
                        lec["hasMarked"] = cur.fetchone() is not None
                    else:
                        lec["hasMarked"] = False

                    del lec["days_until"]
                    lectures.append(lec)

        return success({"lectures": lectures})

    except Exception as e:
        # Return empty list gracefully so the app doesn't crash
        return success({"lectures": [], "warning": "Could not load schedule. Please try again."})


@dashboard_bp.post("/get_admin_dashboard")
def get_admin_dashboard():
    day = current_day_name()
    time_now = current_time_str()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                _LECTURE_QUERY + " WHERE t.day_of_week = %s ORDER BY t.start_time ASC",
                (day,),
            )
            lectures = []
            for r in cur.fetchall():
                lec = dict(r)
                if lec.get("start_time"): lec["start_time"] = str(lec["start_time"])
                if lec.get("end_time"): lec["end_time"] = str(lec["end_time"])
                lec["course_name"] = lec.get("subject_name")
                
                if lec.get("start_time") and lec.get("end_time"):
                    lec["isLive"] = lec["start_time"] <= time_now <= lec["end_time"]
                else:
                    lec["isLive"] = False
                    
                lectures.append(lec)
    return success({"lectures": lectures})

@dashboard_bp.post("/get_lecturer_dashboard")
def get_lecturer_dashboard():
    data = request.get_json(force=True, silent=True) or {}
    lecturer_index = data.get("index_number", "")
    day = current_day_name()
    time_now = current_time_str()
    today = today_str()

    with get_connection() as conn:
        with conn.cursor() as cur:
            query = _LECTURE_QUERY + " JOIN lecturer_subjects ls ON t.subject_id = ls.subject_id "

            cur.execute(
                query + "WHERE ls.lecturer_index = %s AND t.day_of_week = %s AND %s BETWEEN t.start_time AND t.end_time LIMIT 1",
                (lecturer_index, day, time_now),
            )
            lecture = cur.fetchone()

            if lecture:
                lecture = dict(lecture)
                lecture["isLive"] = True
                lecture["course_name"] = lecture["subject_name"] 
                lecture["course_id"] = lecture["subject_id"]
                if lecture.get("start_time"): lecture["start_time"] = str(lecture["start_time"])
                if lecture.get("end_time"): lecture["end_time"] = str(lecture["end_time"])

                cur.execute(
                    """
                    SELECT 
                        COUNT(id) as total_marked,
                        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as total_present,
                        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as total_absent
                    FROM attendance
                    WHERE timetable_id = %s AND DATE(marked_at) = %s
                    """,
                    (lecture["id"], today),
                )
                stats = cur.fetchone()
                if stats:
                    lecture["attendance_stats"] = {
                        "total_marked": stats["total_marked"] or 0,
                        "total_present": stats["total_present"] or 0,
                        "total_absent": stats["total_absent"] or 0,
                    }
                else:
                    lecture["attendance_stats"] = {"total_marked": 0, "total_present": 0, "total_absent": 0}
                
                return success({"lecture": lecture})

            cur.execute(
                query + "WHERE ls.lecturer_index = %s AND t.day_of_week = %s AND t.start_time > %s ORDER BY t.start_time ASC LIMIT 1",
                (lecturer_index, day, time_now),
            )
            next_lecture = cur.fetchone()

    if next_lecture:
        next_lecture = dict(next_lecture)
        next_lecture["isLive"] = False
        next_lecture["course_name"] = next_lecture["subject_name"]
        next_lecture["course_id"] = next_lecture["subject_id"]
        if next_lecture.get("start_time"): next_lecture["start_time"] = str(next_lecture["start_time"])
        if next_lecture.get("end_time"): next_lecture["end_time"] = str(next_lecture["end_time"])
        return success({"lecture": next_lecture})

    return success({"lecture": None, "message": "No more lectures today"})

@dashboard_bp.post("/get_lecturer_timetable")
def get_lecturer_timetable():
    data = request.get_json(force=True, silent=True) or {}
    lecturer_index = data.get("index_number", "")
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            query = _LECTURE_QUERY + " JOIN lecturer_subjects ls ON t.subject_id = ls.subject_id "
            cur.execute(
                query + "WHERE ls.lecturer_index = %s ORDER BY CASE t.day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 ELSE 6 END, t.start_time ASC",
                (lecturer_index,)
            )
            lectures = []
            for r in cur.fetchall():
                lec = dict(r)
                if lec.get("start_time"): lec["start_time"] = str(lec["start_time"])
                if lec.get("end_time"): lec["end_time"] = str(lec["end_time"])
                lec["course_name"] = lec.get("subject_name")
                lectures.append(lec)
    return success({"lectures": lectures})

@dashboard_bp.post("/get_lecturer_report")
def get_lecturer_report():
    data = request.get_json(force=True, silent=True) or {}
    lecturer_index = data.get("index_number", "")
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id as subject_id, s.subject_code, s.subject_name
                FROM subjects s
                JOIN lecturer_subjects ls ON s.id = ls.subject_id
                WHERE ls.lecturer_index = %s
                """,
                (lecturer_index,)
            )
            subjects = [dict(r) for r in cur.fetchall()]
            
            for sub in subjects:
                cur.execute(
                    """
                    SELECT 
                        COUNT(id) as total_marked,
                        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as total_present,
                        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as total_absent
                    FROM attendance
                    WHERE subject_id = %s
                    """,
                    (sub["subject_id"],)
                )
                stats = cur.fetchone()
                if stats:
                    sub["total_marked"] = stats["total_marked"] or 0
                    sub["total_present"] = stats["total_present"] or 0
                    sub["total_absent"] = stats["total_absent"] or 0
                else:
                    sub["total_marked"] = 0
                    sub["total_present"] = 0
                    sub["total_absent"] = 0
                    
                total = sub["total_present"] + sub["total_absent"]
                sub["attendance_percentage"] = f"{round((sub['total_present'] / total) * 100, 1)}%" if total > 0 else "0%"
                
    return success({"reports": subjects})
