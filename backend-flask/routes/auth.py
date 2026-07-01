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


@auth_bp.post("/get_user_by_id")
def get_user_by_id():
    data = request.get_json(force=True, silent=True) or {}
    user_id = data.get("user_id", "").strip()
    if not user_id:
        return error("user_id is required")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, role, nic, full_name, dept_id, batch_year
                FROM users WHERE user_id = %s LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone()
    if row:
        return success(dict(row))
    return error("User not found")

