import os

from api.logRoutes import loggingBlueprint # First due to logging registers
from api.auth import authBlueprint
from api.monitoring import monitoringBlueprint
from api.storage.fileRoutes import fileBlueprint
from api.storage.folderRoutes import folderBlueprint
from db import db
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from models import File, User
from sqlalchemy import text
from werkzeug.utils import secure_filename

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = "change-this-in-prod"


UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

db.init_app(app)
with app.app_context():
    db.create_all()

jwt = JWTManager(app)


@app.route("/")
def home():
    return "Backend is running!"


# @app.route("/register", methods=["POST"])
# def register():
#     data = request.get_json()
#
#     if not data or not data.get("username") or not data.get("password"):
#         return jsonify({"message": "Missing username or password"}), 400
#
#     if User.query.filter_by(username=data["username"]).first():
#         return jsonify({"message": "User already exists"}), 400
#
#     user = User(username=data["username"])
#     user.set_password(data["password"])
#
#     db.session.add(user)
#     db.session.commit()
#
#     return jsonify(
#         {
#             "message": "User created",
#             "access_token": create_access_token(identity=user.username),
#         }
#     ), 201


# @app.route("/login", methods=["POST"])
# def login():
#     data = request.get_json()
#
#     user = User.query.filter_by(username=data.get("username")).first()
#
#     if user and user.check_password(data.get("password")):
#         return jsonify(
#             {
#                 "message": "Login successful",
#                 "access_token": create_access_token(identity=user.username),
#             }
#         )
#
#     return jsonify({"message": "Invalid credentials"}), 401


@app.route("/upload", methods=["POST"])
@jwt_required()
def upload_file():
    if "file" not in request.files:
        return jsonify({"message": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    filename = secure_filename(file.filename)
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    file.save(path)

    new_file = File(
        filename=filename,
        path=path,
        size=os.path.getsize(path),
    )

    db.session.add(new_file)
    db.session.commit()

    return jsonify({"message": f"Uploaded {filename}"}), 200


@app.route("/files", methods=["GET"])
@jwt_required()
def list_files():
    files = File.query.all()

    return jsonify([{"id": f.id, "name": f.filename, "size": f.size} for f in files])


@app.route("/delete/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_file(file_id):
    file = File.query.get(file_id)

    if not file:
        return jsonify({"message": "File not found"}), 404

    if os.path.exists(file.path):
        os.remove(file.path)

    db.session.delete(file)
    db.session.commit()

    return jsonify({"message": "Deleted successfully"})


@app.route("/download/<int:file_id>", methods=["GET"])
@jwt_required()
def download_file(file_id):
    file = File.query.get(file_id)

    if not file:
        return jsonify({"message": "File not found"}), 404

    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        os.path.basename(file.path),
        as_attachment=True,
    )


# Register routes from blueprints #

# ========== Users and Account Blueprints ==========
from flask import Blueprint

usersBlueprint = Blueprint("users", __name__, url_prefix="/api/users")
accountBlueprint = Blueprint("account", __name__, url_prefix="/api/account")


def _is_admin(username: str) -> bool:
    user = User.query.filter_by(username=username).first()
    return bool(user and getattr(user, "is_admin", False))


@usersBlueprint.route("/create", methods=["POST"])
@jwt_required()
def users_create():
    data = request.get_json(silent=True) or {}
    current = get_jwt_identity()

    if not _is_admin(current):
        return jsonify({"message": "Admin privileges required"}), 403

    username = (data.get("username") or "").strip()
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "User already exists"}), 409

    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify(
        {"message": "User created", "user": {"id": user.id, "username": user.username}}
    ), 201


@usersBlueprint.route("/delete", methods=["POST"])
@jwt_required()
def users_delete():
    data = request.get_json(silent=True) or {}
    current = get_jwt_identity()

    if not _is_admin(current):
        return jsonify({"message": "Admin privileges required"}), 403

    username = (data.get("username") or "").strip()
    if not username:
        return jsonify({"message": "Missing username"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    if username == current:
        return jsonify({"message": "Admin cannot delete own account"}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200


@usersBlueprint.route("/modify", methods=["POST"])
@jwt_required()
def users_modify():
    data = request.get_json(silent=True) or {}
    current = get_jwt_identity()
    target = (data.get("username") or current).strip()

    if target != current and not _is_admin(current):
        return jsonify(
            {"message": "Admin privileges required to modify other users"}
        ), 403

    user = User.query.filter_by(username=target).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    new_password = data.get("password")
    if new_password:
        user.set_password(new_password)

    db.session.commit()
    return jsonify(
        {"message": "User updated", "user": {"id": user.id, "username": user.username}}
    ), 200


@usersBlueprint.route("/permissions", methods=["GET", "POST"])
@jwt_required()
def users_permissions():
    # Placeholder: No storage allocation model exists yet.
    if request.method == "GET":
        return jsonify({"message": "Not implemented", "permissions": {}}), 200
    return jsonify({"message": "Permissions updated (placeholder)"}), 200


@accountBlueprint.route("/", methods=["GET"])
@jwt_required()
def account_root():
    current = get_jwt_identity()
    return jsonify({"message": "Account endpoint", "user": current}), 200


@accountBlueprint.route("/whoami", methods=["GET"])
@jwt_required()
def account_whoami():
    return jsonify({"user": get_jwt_identity()}), 200


@accountBlueprint.route("/modify", methods=["POST"])
@jwt_required()
def account_modify():
    data = request.get_json(silent=True) or {}
    current = get_jwt_identity()
    target = (data.get("username") or current).strip()

    if target != current and not _is_admin(current):
        return jsonify(
            {"message": "Admin privileges required to modify other users"}
        ), 403

    user = User.query.filter_by(username=target).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    new_password = data.get("password")
    if new_password:
        user.set_password(new_password)

    db.session.commit()
    return jsonify(
        {
            "message": "Account updated",
            "user": {"id": user.id, "username": user.username},
        }
    ), 200


# Register file routes

app.register_blueprint(fileBlueprint)

# Register folder routes

app.register_blueprint(folderBlueprint)

# Register monitoring routes

app.register_blueprint(monitoringBlueprint)
app.register_blueprint(loggingBlueprint)
app.register_blueprint(authBlueprint)
app.register_blueprint(usersBlueprint)
app.register_blueprint(accountBlueprint)

# Register backup routes
from api.maintenance.backupRoutes import backupBlueprint
app.register_blueprint(backupBlueprint)
from api.maintenance.backupScheduleRoutes import backupScheduleRoutes, initScheduler
app.register_blueprint(backupScheduleRoutes)
initScheduler(app)

# Note this does not run if using 'flask run'
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        # Ensure a default admin user exists
        from os import getenv

        # Lightweight migration: ensure required User columns exist (SQLite)
        # Uses PRAGMA table_info to discover existing columns and ALTER TABLE to add missing ones.
        try:
            existing_cols = set()
            res = db.session.execute(text("PRAGMA table_info('user')"))
            for row in res:
                # row[1] is the column name in SQLite pragma output
                try:
                    existing_cols.add(row[1])
                except Exception:
                    # Fallback for mapping-like rows
                    existing_cols.add(row["name"])
        except Exception:
            existing_cols = set()

        def _add_col(sql: str) -> None:
            try:
                db.session.execute(text(sql))
                db.session.commit()
            except Exception:
                db.session.rollback()

        if "email" not in existing_cols:
            _add_col("ALTER TABLE user ADD COLUMN email VARCHAR(100)")
        if "storage_allocation" not in existing_cols:
            _add_col(
                "ALTER TABLE user ADD COLUMN storage_allocation INTEGER DEFAULT 1073741824"
            )
        if "max_file_size" not in existing_cols:
            _add_col(
                "ALTER TABLE user ADD COLUMN max_file_size INTEGER DEFAULT 104857600"
            )
        if "is_admin" not in existing_cols:
            _add_col("ALTER TABLE user ADD COLUMN is_admin BOOLEAN DEFAULT 0")
        if "created_at" not in existing_cols:
            _add_col(
                "ALTER TABLE user ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"
            )
        # Ensure an admin user exists and is flagged as admin
        admin = User.query.filter_by(username="admin").first()
        if not admin:
            admin_password = getenv("ADMIN_PASSWORD", "admin123")
            admin = User(username="admin", is_admin=True)
            admin.set_password(admin_password)
            db.session.add(admin)
            db.session.commit()
        elif not getattr(admin, "is_admin", False):
            admin.is_admin = True
            db.session.commit()

    app.run(debug=True, threaded=True)
