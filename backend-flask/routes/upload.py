import os
import time
from flask import Blueprint, request, current_app
from database.db import get_connection
from utils.response import success, error

upload_bp = Blueprint("upload", __name__)

ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.post("/upload_medical")
def upload_medical():
    record_id = request.form.get("record_id", "").strip()
    if not record_id:
        return error("record_id is required")

    if "medical_file" not in request.files:
        return error("No file uploaded (field: medical_file)")

    file = request.files["medical_file"]
    if file.filename == "":
        return error("Empty filename")

    if not _allowed(file.filename):
        return error(f"File type not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}")

    upload_dir = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_dir, exist_ok=True)

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"medical_{record_id}_{int(time.time())}.{ext}"
    target_path = os.path.join(upload_dir, filename)
    file.save(target_path)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE attendance SET medical_report = %s WHERE id = %s",
                (target_path, record_id),
            )
        conn.commit()

    return success({"message": "Medical report uploaded", "path": target_path})
