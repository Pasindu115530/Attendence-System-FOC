from flask import Blueprint, request
from services.attendance_service import process_mark_attendance
from utils.response import success, error

attendance_bp = Blueprint("attendance", __name__)


@attendance_bp.post("/mark_attendance")
def mark_attendance():
    data = request.get_json(force=True, silent=True) or {}

    # Support both old and new keys to prevent abrupt client crashes
    index_number = data.get("index_number") or data.get("user_id")
    subject_id = data.get("subject_id") or data.get("course_id")
    timetable_id = data.get("timetable_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not all([index_number, timetable_id, subject_id, latitude, longitude]):
        return error("Missing required fields (index_number, subject_id, timetable_id, lat, lon)")

    # Normalize data for the service
    data["index_number"] = index_number
    data["subject_id"] = subject_id

    result = process_mark_attendance(data)

    if not result["ok"]:
        return error(result["message"])

    return success({
        "message": result["message"],
        "attendance_status": result["attendance_status"],
        "distance": result["distance"],
    })
