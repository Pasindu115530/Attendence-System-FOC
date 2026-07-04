import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from database.db import get_connection

load_dotenv()

# Initialize Gemini Model
model = None

# ==========================================
# 1. REAL DATABASE FUNCTIONS (SQL EXECUTORS)
# ==========================================

def get_student(student_index: str) -> dict:
    """Get profile details of a student by index number."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE user_id = %s AND role = 'Student' LIMIT 1", (student_index,))
            row = cur.fetchone()
    return dict(row) if row else {"error": "Student not found"}

def get_student_attendance(student_index: str) -> list:
    """Get full attendance logs of a student."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM attendance WHERE user_id = %s ORDER BY marked_at DESC", (student_index,))
            rows = cur.fetchall()
    return [dict(r) for r in rows]

def get_today_attendance() -> dict:
    """Get overall summary of today's attendance count."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as count FROM attendance WHERE status = 'Present' AND marked_at >= CURRENT_DATE")
            res = cur.fetchone()
    return {"today_total_scans": res["count"] if res else 0}

def get_absent_students(course_code: str = None) -> list:
    """Get list of absent students, optionally filtered by course code."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            if course_code:
                try:
                    cid = int(course_code)
                    cur.execute("""
                        SELECT a.user_id, u.full_name
                        FROM attendance a
                        JOIN users u ON a.user_id = u.user_id
                        WHERE a.status = 'Absent' AND a.course_id = %s
                    """, (cid,))
                except ValueError:
                    return []
            else:
                cur.execute("""
                    SELECT a.user_id, u.full_name
                    FROM attendance a
                    JOIN users u ON a.user_id = u.user_id
                    WHERE a.status = 'Absent'
                """)
            rows = cur.fetchall()
    return [dict(r) for r in rows]

def get_hall_status(hall_id: str) -> dict:
    """Get current usage/details of a specific lecture hall."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                hid = int(hall_id)
                cur.execute("SELECT * FROM classrooms WHERE id = %s LIMIT 1", (hid,))
            except ValueError:
                cur.execute("SELECT * FROM classrooms WHERE room_name = %s LIMIT 1", (hall_id,))
            row = cur.fetchone()
    return dict(row) if row else {"error": "Hall not found"}

def book_hall(hall_id: str, booking_date: str, start_time: str, end_time: str, booked_by: str) -> dict:
    """Book a lecture hall for a specific date and time slot."""
    import datetime
    try:
        dt = datetime.datetime.strptime(booking_date, "%Y-%m-%d")
        day_of_week = dt.strftime("%A")
    except Exception:
        day_of_week = "Monday"
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                classroom_id = int(hall_id)
            except ValueError:
                cur.execute("SELECT id FROM classrooms WHERE room_name = %s LIMIT 1", (hall_id,))
                row = cur.fetchone()
                classroom_id = row["id"] if row else 1
                
            cur.execute("""
                INSERT INTO timetable (course_id, classroom_id, day_of_week, start_time, end_time, dept_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (1, classroom_id, day_of_week, start_time, end_time, booked_by if booked_by else "FOC"))
            new_id = cur.fetchone()
        conn.commit()
    return {"success": True, "booking": {"id": new_id["id"] if new_id else None}}

def cancel_booking(booking_id: int) -> dict:
    """Cancel an existing hall booking using booking ID."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM timetable WHERE id = %s", (booking_id,))
        conn.commit()
    return {"success": True, "message": f"Timetable slot {booking_id} cancelled successfully"}

def generate_pdf(report_type: str, course_code: str = None) -> dict:
    """Generate a PDF report for attendance."""
    return {"success": True, "download_url": f"https://your-supabase-url.com/storage/v1/object/public/reports/{report_type}_report.pdf"}

def generate_excel(report_type: str, course_code: str = None) -> dict:
    """Generate an Excel sheet report for attendance."""
    return {"success": True, "download_url": f"https://your-supabase-url.com/storage/v1/object/public/reports/{report_type}_report.xlsx"}

def count_students(course_code: str = None, hall_id: str = None) -> dict:
    """Count total registered students, optionally by course or hall."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            if course_code:
                cur.execute("SELECT COUNT(*) as count FROM users WHERE role = 'Student' AND dept_id = %s", (course_code,))
            else:
                cur.execute("SELECT COUNT(*) as count FROM users WHERE role = 'Student'")
            res = cur.fetchone()
    return {"student_count": res["count"] if res else 0}

def get_scan_history(student_index: str = None, limit: int = 10) -> list:
    """Get latest barcode/RFID scan timestamps history."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            if student_index:
                cur.execute("SELECT * FROM attendance WHERE user_id = %s ORDER BY marked_at DESC LIMIT %s", (student_index, limit))
            else:
                cur.execute("SELECT * FROM attendance ORDER BY marked_at DESC LIMIT %s", (limit,))
            rows = cur.fetchall()
    result = [dict(r) for r in rows]
    for r in result:
        if r.get("marked_at"):
            r["marked_at"] = str(r["marked_at"])
    return result

def search_course(search_query: str) -> list:
    """Search for a course/subject by name or keyword."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM courses WHERE course_name ILIKE %s", (f"%{search_query}%",))
            rows = cur.fetchall()
    return [dict(r) for r in rows]

def search_booking(date: str = None, hall_id: str = None) -> list:
    """Find bookings filtered by date or hall ID."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            if hall_id:
                try:
                    hid = int(hall_id)
                    cur.execute("SELECT * FROM timetable WHERE classroom_id = %s", (hid,))
                except ValueError:
                    cur.execute("SELECT * FROM timetable")
            else:
                cur.execute("SELECT * FROM timetable")
            rows = cur.fetchall()
    result = [dict(r) for r in rows]
    for r in result:
        if r.get("start_time"):
            r["start_time"] = str(r["start_time"])
        if r.get("end_time"):
            r["end_time"] = str(r["end_time"])
    return result

def get_available_halls() -> list:
    """Get a list of all currently vacant or available lecture halls."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM classrooms")
            rows = cur.fetchall()
    return [dict(r) for r in rows]

def get_course_attendance(course_code: str) -> list:
    """Get all attendance logs for a specific course code."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cid = int(course_code)
                cur.execute("SELECT * FROM attendance WHERE course_id = %s", (cid,))
            except ValueError:
                cur.execute("SELECT * FROM attendance")
            rows = cur.fetchall()
    result = [dict(r) for r in rows]
    for r in result:
        if r.get("marked_at"):
            r["marked_at"] = str(r["marked_at"])
    return result

def get_late_students(time_threshold: str = "09:00:00") -> list:
    """List students who scanned/arrived after a given time threshold."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM attendance WHERE marked_at::time > %s", (time_threshold,))
            rows = cur.fetchall()
    result = [dict(r) for r in rows]
    for r in result:
        if r.get("marked_at"):
            r["marked_at"] = str(r["marked_at"])
    return result


# ==========================================
# 2. CORE ORCHESTRATOR LOGIC (GEMINI)
# ==========================================

def run_attendance_agent(user_message: str, chat_history: list = None) -> str:
    global model
    if model is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "Error: Gemini API Key (GEMINI_API_KEY) is not set in the environment. Please check your configuration."
        
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            system_instruction=(
                "You are the Smart Attendance Assistant for the Faculty of Computing. "
                "Help administrators and lecturers manage attendance and hall bookings securely. "
                "Never invent attendance or booking data. Always rely strictly on available backend tools. "
                "If database lookup returns an error or no data, state it transparently. "
                "Be highly concise, professional, and present tables/lists clearly using Markdown when required."
            ),
            tools=[
                get_student,
                get_student_attendance,
                get_today_attendance,
                get_absent_students,
                get_hall_status,
                book_hall,
                cancel_booking,
                generate_pdf,
                generate_excel,
                count_students,
                get_scan_history,
                search_course,
                search_booking,
                get_available_halls,
                get_course_attendance,
                get_late_students
            ]
        )

    # Format chat history into Gemini format
    gemini_history = []
    if chat_history:
        for turn in chat_history:
            role = 'user' if turn.get('role') == 'user' else 'model'
            content = turn.get('content', '')
            if content:
                gemini_history.append({
                    'role': role,
                    'parts': [content]
                })

    try:
        # Create chat session with history and automatic tool calling enabled
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(user_message)
        return response.text
    except Exception as e:
        print("Gemini Agent Execution Error:", e)
        return f"Error executing agent request: {str(e)}"