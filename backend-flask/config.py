import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "6543")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")

    # File uploads
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads/medical")
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB

    # Face recognition
    KNOWN_STUDENTS_PATH = os.getenv("KNOWN_STUDENTS_PATH", "known_students")
    FACE_MODEL = os.getenv("FACE_MODEL", "VGG-Face")

    # Timezone
    TIMEZONE = "Asia/Colombo"
