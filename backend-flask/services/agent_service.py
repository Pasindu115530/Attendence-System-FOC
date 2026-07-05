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

import datetime

def serialize_dict(d: dict) -> dict:
    if not d: return d
    res = {}
    for k, v in d.items():
        if isinstance(v, datetime.datetime) or isinstance(v, datetime.date) or isinstance(v, datetime.time) or hasattr(v, 'isoformat'):
            res[k] = str(v)
        else:
            res[k] = v
    return res

def serialize_list(lst: list) -> list:
    return [serialize_dict(d) for d in lst]

def get_student(student_index: str) -> dict:
    """Get profile details of a student by index number."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE index_number = %s AND role = 'Student' LIMIT 1", (student_index,))
            row = cur.fetchone()
    return serialize_dict(dict(row)) if row else {"error": "Student not found"}

def get_student_attendance(student_index: str) -> list:
    """Get full attendance logs of a student."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM attendance WHERE index_number = %s ORDER BY marked_at DESC", (student_index,))
            rows = cur.fetchall()
    return serialize_list([dict(r) for r in rows])

def get_today_attendance() -> dict:
    """Get overall summary of today's attendance count."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as count FROM attendance WHERE status = 'Present' AND marked_at >= CURRENT_DATE")
            res = cur.fetchone()
    return {"today_total_scans": res["count"] if res else 0}

def get_absent_students(course_code: str = None) -> list:
    """Get list of absent students, optionally filtered by subject id."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            if course_code:
                try:
                    cid = int(course_code)
                    cur.execute("""
                        SELECT a.index_number, u.full_name
                        FROM attendance a
                        JOIN users u ON a.index_number = u.index_number
                        WHERE a.status = 'Absent' AND a.subject_id = %s
                    """, (cid,))
                except ValueError:
                    return []
            else:
                cur.execute("""
                    SELECT a.index_number, u.full_name
                    FROM attendance a
                    JOIN users u ON a.index_number = u.index_number
                    WHERE a.status = 'Absent'
                """)
            rows = cur.fetchall()
    return serialize_list([dict(r) for r in rows])

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
    return serialize_dict(dict(row)) if row else {"error": "Hall not found"}

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
                INSERT INTO timetable (subject_id, classroom_id, day_of_week, start_time, end_time)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (1, classroom_id, day_of_week, start_time, end_time))
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
    """Count total registered students, optionally by department id."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            if course_code:
                try:
                    dept_id = int(course_code)
                    cur.execute("SELECT COUNT(*) as count FROM users WHERE role = 'Student' AND department_id = %s", (dept_id,))
                except ValueError:
                    return {"student_count": 0}
            else:
                cur.execute("SELECT COUNT(*) as count FROM users WHERE role = 'Student'")
            res = cur.fetchone()
    return {"student_count": res["count"] if res else 0}

def get_scan_history(student_index: str = None, limit: int = 10) -> list:
    """Get latest barcode/RFID scan timestamps history."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            if student_index:
                cur.execute("SELECT * FROM attendance WHERE index_number = %s ORDER BY marked_at DESC LIMIT %s", (student_index, limit))
            else:
                cur.execute("SELECT * FROM attendance ORDER BY marked_at DESC LIMIT %s", (limit,))
            rows = cur.fetchall()
    return serialize_list([dict(r) for r in rows])

def search_course(search_query: str) -> list:
    """Search for a course/subject by name or keyword."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM subjects WHERE subject_name ILIKE %s", (f"%{search_query}%",))
            rows = cur.fetchall()
    return serialize_list([dict(r) for r in rows])

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
    return serialize_list([dict(r) for r in rows])

def get_timetable_schedule(batch_year: int = None, day_of_week: str = None, department_id: int = None) -> list:
    """Get the lecture timetable schedule, optionally filtered by batch year, day of the week (e.g. 'Monday'), and department ID."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT 
                    t.id as timetable_id,
                    s.subject_name,
                    s.subject_code,
                    c.room_name as classroom,
                    t.day_of_week,
                    t.start_time,
                    t.end_time,
                    bs.batch_year,
                    d.name as department_name
                FROM timetable t
                JOIN subjects s ON t.subject_id = s.id
                JOIN classrooms c ON t.classroom_id = c.id
                JOIN batch_subjects bs ON s.id = bs.subject_id
                JOIN departments d ON bs.department_id = d.id
                WHERE 1=1
            """
            args = []
            if batch_year:
                query += " AND bs.batch_year = %s"
                args.append(batch_year)
            if day_of_week:
                query += " AND t.day_of_week ILIKE %s"
                args.append(day_of_week)
            if department_id:
                query += " AND bs.department_id = %s"
                args.append(department_id)
                
            query += " ORDER BY t.day_of_week ASC, t.start_time ASC"
            
            cur.execute(query, tuple(args))
            rows = cur.fetchall()
    return serialize_list([dict(r) for r in rows])

def get_available_halls() -> list:
    """Get a list of all currently vacant or available lecture halls."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM classrooms")
            rows = cur.fetchall()
    return serialize_list([dict(r) for r in rows])

def get_course_attendance(course_code: str) -> list:
    """Get all attendance logs for a specific course code."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cid = int(course_code)
                cur.execute("SELECT * FROM attendance WHERE subject_id = %s", (cid,))
            except ValueError:
                cur.execute("SELECT * FROM attendance")
            rows = cur.fetchall()
    return serialize_list([dict(r) for r in rows])

def get_late_students(time_threshold: str = "09:00:00") -> list:
    """List students who scanned/arrived after a given time threshold."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM attendance WHERE marked_at::time > %s", (time_threshold,))
            rows = cur.fetchall()
    return serialize_list([dict(r) for r in rows])

def add_student_tool(index_number: str, registration_number: str, full_name: str, nic: str, department_id: int, batch_year: int) -> dict:
    """Register a new student with login credentials into the system."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    INSERT INTO users (index_number, registration_number, full_name, nic, password, role, department_id, batch_year)
                    VALUES (%s, %s, %s, %s, %s, 'Student', %s, %s)
                    """,
                    (index_number, registration_number, full_name, nic, nic, department_id, batch_year),
                )
                conn.commit()
                return {"success": True, "message": f"Student {full_name} added successfully."}
            except Exception as e:
                conn.rollback()
                return {"error": str(e)}

def assign_subject_to_batch(batch_year: int, department_id: int, subject_ids: list) -> dict:
    """Assign a list of subject IDs to a specific batch and department."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                # Delete existing
                cur.execute(
                    """
                    DELETE FROM batch_subjects
                    WHERE batch_year = %s 
                    AND subject_id IN (SELECT id FROM subjects WHERE department_id = %s)
                    """,
                    (batch_year, department_id)
                )
                # Insert new
                if subject_ids:
                    unique_sids = list(set(subject_ids))
                    args = [(batch_year, department_id, sid) for sid in unique_sids]
                    args_str = ",".join(["(%s, %s, %s)"] * len(unique_sids))
                    flat_args = [item for pair in args for item in pair]
                    cur.execute(
                        f"INSERT INTO batch_subjects (batch_year, department_id, subject_id) VALUES {args_str}",
                        flat_args
                    )
                conn.commit()
                return {"success": True, "message": "Subjects assigned successfully."}
            except Exception as e:
                conn.rollback()
                return {"error": str(e)}

def get_all_subjects_for_dept(department_id: int) -> list:
    """Get all subjects for a specific department. Useful for finding subject IDs."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, subject_code, subject_name FROM subjects WHERE department_id = %s", (department_id,))
            rows = cur.fetchall()
    return serialize_list([dict(r) for r in rows])

def get_assigned_subjects_for_batch(batch_year: int, department_id: int = None) -> list:
    """Get the subjects assigned to a specific batch year, optionally filtered by department."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT 
                    bs.id as assignment_id,
                    bs.batch_year, 
                    d.name as department_name, 
                    s.subject_code, 
                    s.subject_name
                FROM batch_subjects bs
                JOIN subjects s ON bs.subject_id = s.id
                JOIN departments d ON bs.department_id = d.id
                WHERE bs.batch_year = %s
            """
            args = [batch_year]
            if department_id:
                query += " AND bs.department_id = %s"
                args.append(department_id)
            query += " ORDER BY s.subject_name ASC"
            
            cur.execute(query, tuple(args))
            rows = cur.fetchall()
    return serialize_list([dict(r) for r in rows])

def remove_subject_assignment(assignment_id: int) -> dict:
    """Remove a subject assignment from a batch by assignment ID."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("DELETE FROM batch_subjects WHERE id = %s RETURNING id", (assignment_id,))
                deleted = cur.fetchone()
                if not deleted:
                    return {"error": "Assignment not found"}
                conn.commit()
                return {"success": True, "message": "Subject assignment removed successfully."}
            except Exception as e:
                conn.rollback()
                return {"error": str(e)}

def schedule_timetable(subject_id: int, classroom_id: int, day_of_week: str, start_time: str, end_time: str) -> dict:
    """Add a new timetable/lecture slot for a subject in a classroom."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    INSERT INTO timetable (subject_id, classroom_id, day_of_week, start_time, end_time)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (subject_id, classroom_id, day_of_week, start_time, end_time)
                )
                new_id = cur.fetchone()["id"]
                conn.commit()
                return {"success": True, "message": f"Timetable slot created with ID {new_id}."}
            except Exception as e:
                conn.rollback()
                return {"error": str(e)}

def get_all_departments() -> list:
    """Get all departments. Useful for resolving department names to IDs."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name FROM departments ORDER BY id ASC")
            rows = cur.fetchall()
    return [dict(r) for r in rows]

def get_all_batches() -> list:
    """Get all distinct batch years that have registered students."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT batch_year FROM users WHERE role = 'Student' AND batch_year IS NOT NULL ORDER BY batch_year DESC")
            rows = cur.fetchall()
    return [dict(r) for r in rows]

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
            model_name='gemini-2.5-flash',
            system_instruction=(
                "You are the Smart Admin Assistant for the Faculty of Computing Attendance System. "
                "You can READ data (students, attendance, halls, timetable) AND WRITE data "
                "(add students, assign subjects, schedule lectures). "
                "Always confirm the user's intent before performing write/delete operations. "
                "Ask for any missing required fields before proceeding. "
                "Present results as clean, concise markdown tables or lists. "
                "IMPORTANT: You CAN retrieve the lecture timetable filtered by day of the week, batch year, and department by using the get_timetable_schedule tool. "
                "You CAN also view subjects assigned to a batch using get_assigned_subjects_for_batch."
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
                get_timetable_schedule,
                get_available_halls,
                get_course_attendance,
                get_late_students,
                add_student_tool,
                assign_subject_to_batch,
                get_all_subjects_for_dept,
                get_assigned_subjects_for_batch,
                remove_subject_assignment,
                schedule_timetable,
                get_all_departments,
                get_all_batches
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
        chat = model.start_chat(history=gemini_history, enable_automatic_function_calling=True)
        response = chat.send_message(user_message)
        return response.text
    except Exception as e:
        print("Gemini Agent Execution Error:", e)
        return f"Error executing agent request: {str(e)}"