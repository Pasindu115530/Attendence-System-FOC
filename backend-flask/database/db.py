import psycopg2
import psycopg2.extras
from config import Config


def get_connection():
    """Return a new PostgreSQL connection using config values."""
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
