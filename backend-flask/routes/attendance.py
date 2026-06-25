from flask import Blueprint, request
from services.attendance_service import process_mark_attendance
from utils.response import success, error

attendance_bp = Blueprint("attendance", __name__)


@attendance_bp.post("/mark_attendance")
def mark_attendance():
    data = request.get_json(force=True, silent=True) or {}

    required = ("user_id", "timetable_id", "course_id", "latitude", "longitude")
    if any(not data.get(k) for k in required):
        return error("Missing required fields: " + ", ".join(required))

    result = process_mark_attendance(data)

    if not result["ok"]:
        return error(result["message"])

    return success({
        "message": result["message"],
        "attendance_status": result["attendance_status"],
        "distance": result["distance"],
    })
