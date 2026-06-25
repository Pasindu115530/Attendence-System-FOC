import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── Database ─────────────────────────────────────────────────────────────
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "6543")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")

    # ── File uploads (medical reports) ───────────────────────────────────────
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads/medical")
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB

    # ── AWS Rekognition ──────────────────────────────────────────────────────
    # On EC2 with an IAM Role attached, boto3 picks up credentials automatically
    # and AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY can be left blank.
    # For local development, set them in .env.
    AWS_REGION               = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID        = os.getenv("AWS_ACCESS_KEY_ID")        # leave blank on EC2
    AWS_SECRET_ACCESS_KEY    = os.getenv("AWS_SECRET_ACCESS_KEY")    # leave blank on EC2
    REKOGNITION_COLLECTION   = os.getenv("REKOGNITION_COLLECTION", "attendance-students")
    FACE_MATCH_THRESHOLD     = float(os.getenv("FACE_MATCH_THRESHOLD", "90"))  # % confidence

    # ── S3 (optional — for face photo audit trail) ───────────────────────────
    S3_BUCKET = os.getenv("S3_BUCKET", "")   # leave blank to skip S3 storage

    # ── Timezone ─────────────────────────────────────────────────────────────
    TIMEZONE = "Asia/Colombo"
