"""
Face-verification endpoint powered by DeepFace.

POST /verify-face
  Form field: image  (multipart/form-data)

The known_students/ folder must contain one reference photo per student,
named <student_id>.<ext>  (e.g.  S1234.jpg).
DeepFace.find() returns the matched student_id extracted from the filename.
"""

import os
import time
from flask import Blueprint, request, current_app
from utils.response import success, error, failed

face_bp = Blueprint("face", __name__)

_TEMP_PREFIX = "temp_captured_"


@face_bp.post("/verify-face")
def verify_face():
    if "image" not in request.files:
        return error("No image uploaded (field: image)", 400)

    file = request.files["image"]
    if file.filename == "":
        return error("Empty filename", 400)

    # Save the incoming frame to a unique temp path (thread-safe)
    temp_path = f"{_TEMP_PREFIX}{int(time.time() * 1000)}.jpg"
    file.save(temp_path)

    db_path = current_app.config["KNOWN_STUDENTS_PATH"]
    model_name = current_app.config["FACE_MODEL"]

    try:
        from deepface import DeepFace  # lazy import — heavy dependency

        result = DeepFace.find(
            img_path=temp_path,
            db_path=db_path,
            model_name=model_name,
            enforce_detection=True,
            silent=True,
        )

        _cleanup(temp_path)

        if result and len(result) > 0 and not result[0].empty:
            matched_path = result[0]["identity"].iloc[0]
            filename = os.path.basename(matched_path)
            student_id = os.path.splitext(filename)[0]
            return success({
                "message": "Face matched successfully",
                "student_id": student_id,
            })

        return failed("Face does not match any student")

    except Exception as exc:
        _cleanup(temp_path)
        # DeepFace raises ValueError / AttributeError when no face is detected
        return failed(f"No face detected or system error: {exc}")


def _cleanup(path: str) -> None:
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
