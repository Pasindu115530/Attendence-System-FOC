import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")

    # ── Database (Supabase PostgreSQL) ────────────────────────────────────────
    # Preferred: set DATABASE_URL to your Supabase connection string.
    # Supabase → Project Settings → Database → Connection string → URI
    # Use port 6543 (Transaction Pooler) for Flask HTTP workloads.
    # Fallback: individual DB_* vars below are used if DATABASE_URL is not set.
    DATABASE_URL = os.getenv("DATABASE_URL")          # e.g. postgresql://postgres:[password]@db.[ref].supabase.co:6543/postgres

    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "6543")            # 6543 = Transaction Pooler (recommended)
    DB_NAME = os.getenv("DB_NAME", "postgres")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS")

    # ── File uploads (medical reports) ───────────────────────────────────────
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads/medical")
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB

    # ── AWS Rekognition ──────────────────────────────────────────────────────
    # boto3 picks up credentials from environment variables automatically.
    # On a DigitalOcean Droplet, set these as system environment variables
    # or in the .env file (never commit the .env file to git).
    AWS_REGION             = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID      = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY  = os.getenv("AWS_SECRET_ACCESS_KEY")
    REKOGNITION_COLLECTION = os.getenv("REKOGNITION_COLLECTION", "attendance-students")
    FACE_MATCH_THRESHOLD   = float(os.getenv("FACE_MATCH_THRESHOLD", "90"))  # % confidence

    # ── S3 (optional — for face photo audit trail) ───────────────────────────
    S3_BUCKET = os.getenv("S3_BUCKET", "")   # leave blank to skip S3 storage

    # ── Timezone ─────────────────────────────────────────────────────────────
    TIMEZONE = "Asia/Colombo"
