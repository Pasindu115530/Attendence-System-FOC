import os
from flask import Flask
from config import Config

# ── Blueprints ────────────────────────────────────────────────────────────────
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.attendance import attendance_bp
from routes.admin import admin_bp
from routes.report import report_bp
from routes.upload import upload_bp
from routes.classroom import face_bp

# ── Services ──────────────────────────────────────────────────────────────────
from services.rekognition import rekognition_service


def create_app(config_class=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Ensure upload dir exists at startup (medical reports only)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Initialise AWS Rekognition service (lazy boto3 client)
    rekognition_service.init_app(app)

    # ── CORS ─────────────────────────────────────────────────────────────────
    @app.after_request
    def add_cors(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, X-Requested-With"
        )
        return response

    @app.before_request
    def handle_options():
        from flask import request, make_response
        if request.method == "OPTIONS":
            resp = make_response()
            resp.headers["Access-Control-Allow-Origin"] = "*"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            resp.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-Requested-With"
            )
            return resp, 204

    # ── Register Blueprints ───────────────────────────────────────────────────
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(face_bp)

    return app


if __name__ == "__main__":
    flask_app = create_app()
    flask_app.run(host="0.0.0.0", port=5000, debug=True)
