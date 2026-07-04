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
        return error("Index number (username) and NIC (password) are required")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT index_number AS user_id, nic, role
                FROM users
                WHERE index_number = %s AND nic = %s
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
                SELECT u.index_number AS user_id, u.role, u.nic, u.full_name, 
                       d.name AS dept_id, u.batch_year
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.index_number = %s LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone()
    if row:
        return success(dict(row))
    return error("User not found")

