from flask import jsonify


def success(data: dict = None, **kwargs):
    """Return a JSON success envelope."""
    payload = {"status": "success"}
    if data:
        payload.update(data)
    payload.update(kwargs)
    return jsonify(payload)


def error(message: str, http_code: int = 200):
    """Return a JSON error envelope."""
    return jsonify({"status": "error", "message": message}), http_code


def failed(message: str, http_code: int = 200):
    """Return a JSON failed envelope (used for face-match failures)."""
    return jsonify({"status": "failed", "message": message}), http_code
