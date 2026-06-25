from flask import Blueprint, request
from database.db import get_connection
from utils.response import success, error

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    data = request.get_json(force=True, silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return error("Username and password are required")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, nic, role
                FROM users
                WHERE user_id = %s AND nic = %s
                LIMIT 1
                """,
                (username, password),
            )
            user_row = cur.fetchone()

    if user_row:
        return success(dict(user_row))
    return error("Invalid credentials")
