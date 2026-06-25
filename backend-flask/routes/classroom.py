"""
routes/classroom.py — Face recognition endpoints powered by AWS Rekognition.

Replaces the old DeepFace / TensorFlow implementation.
No ML models are run locally — all processing is done by AWS Rekognition API.

Endpoints:
  POST /register-face   — Admin registers a student's face (IndexFaces)
  POST /verify-face     — Login/attendance check (SearchFacesByImage)
  DELETE /delete-face/<user_id> — Remove a student's face vectors
"""

from flask import Blueprint, request, current_app
from services.rekognition import rekognition_service
from utils.response import success, error, failed

face_bp = Blueprint("face", __name__)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_image_bytes() -> tuple[bytes | None, object | None]:
    """
    Extract image bytes from the multipart request.
    Returns (bytes, None) on success or (None, error_response) on failure.
    """
    if "image" not in request.files:
        return None, error("No image uploaded. Use field name: 'image'", 400)
    file = request.files["image"]
    if file.filename == "":
        return None, error("Empty filename", 400)
    image_bytes = file.read()
    if len(image_bytes) == 0:
        return None, error("Empty file uploaded", 400)
    return image_bytes, None


# ── Routes ────────────────────────────────────────────────────────────────────

@face_bp.post("/register-face")
def register_face():
    """
    Register a student's face photo into the AWS Rekognition Collection.

    Request (multipart/form-data):
      user_id  — string, e.g. "S001"
      image    — JPEG/PNG file field

    Response:
      { status: "success", data: { user_id, face_id } }
      { status: "error",   message: "..." }

    Notes:
      - If the student already has a registered face, it is replaced.
      - Image must contain exactly one clear face.
    """
    user_id = request.form.get("user_id", "").strip()
    if not user_id:
        return error("user_id field is required", 400)

    image_bytes, err = _read_image_bytes()
    if err:
        return err

    result = rekognition_service.index_face(user_id, image_bytes)

    if not result["ok"]:
        return error(result["reason"])

    return success({
        "user_id": result["user_id"],
        "face_id": result["face_id"],
        "message": f"Face registered successfully for student {user_id}",
    })


@face_bp.post("/verify-face")
def verify_face():
    """
    Search the Rekognition Collection for the best face match.

    Used for:
      - Face-based attendance marking
      - Face-based login (without student ID entry)

    Request (multipart/form-data):
      image — JPEG/PNG file field (live camera frame)

    Response (match found):
      { status: "success", data: { student_id, confidence, face_id } }

    Response (no match):
      { status: "failed", message: "No matching face found" }

    Response (no face in image):
      { status: "failed", message: "No face detected in the uploaded image" }
    """
    image_bytes, err = _read_image_bytes()
    if err:
        return err

    result = rekognition_service.search_face(image_bytes)

    if not result["ok"]:
        return failed(result["reason"])

    return success({
        "student_id": result["user_id"],
        "confidence": result["confidence"],
        "face_id":    result["face_id"],
        "message":    "Face matched successfully",
    })


@face_bp.delete("/delete-face/<string:user_id>")
def delete_face(user_id: str):
    """
    Remove all face vectors for a student from the Rekognition Collection.

    Used when:
      - A student's face photo needs to be updated
      - A student account is removed

    Request: DELETE /delete-face/S001

    Response:
      { status: "success", data: { user_id, removed_count } }
    """
    if not user_id:
        return error("user_id is required", 400)

    result = rekognition_service.delete_faces(user_id)

    return success({
        "user_id":       user_id,
        "removed_count": result["removed_count"],
        "message":       f"Removed {result['removed_count']} face vector(s) for {user_id}",
    })
