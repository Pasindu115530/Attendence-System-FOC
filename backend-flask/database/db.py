import psycopg2
import psycopg2.extras
from config import Config


def get_connection():
    """
    Return a new PostgreSQL connection to Supabase.

    Priority:
      1. DATABASE_URL  — full Supabase connection string (recommended for production)
      2. Individual DB_* vars — fallback for local development

    sslmode=require is always enforced (Supabase mandates TLS).
    cursor_factory=RealDictCursor returns rows as dicts instead of tuples.
    """
    if Config.DATABASE_URL:
        # Supabase provides this under Project Settings → Database → Connection string
        # Ensure ?sslmode=require is appended if not already in the URL
        dsn = Config.DATABASE_URL
        if "sslmode" not in dsn:
            dsn += "?sslmode=require"
        conn = psycopg2.connect(dsn, cursor_factory=psycopg2.extras.RealDictCursor)
    else:
        # Fallback: individual DB_* environment variables
        dsn = (
            f"host={Config.DB_HOST} "
            f"port={Config.DB_PORT} "
            f"dbname={Config.DB_NAME} "
            f"user={Config.DB_USER} "
            f"password={Config.DB_PASS} "
            f"sslmode=require"
        )
        conn = psycopg2.connect(dsn, cursor_factory=psycopg2.extras.RealDictCursor)
    return conn
