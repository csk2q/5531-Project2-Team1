import logging
import mimetypes
import os

from db import db

logger = logging.getLogger(__name__)
from flask_cors import CORS
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import File, Permission, User
from werkzeug.utils import secure_filename

from flask import (
    Blueprint,
    Flask,
    abort,
    current_app,
    flash,
    jsonify,
    redirect,
    request,
    send_from_directory,
    url_for,
)

fileBlueprint = Blueprint("fileRoutes", __name__)


# about
@fileBlueprint.route("/api/storage/file/about/<fileID>", methods=["GET"])
@jwt_required()
def about_file(fileID):
    # Full absolute path
    full_path = os.path.join(
        "uploads", secure_filename(fileID)
    )

    if not os.path.isfile(full_path):
        return abort(404, description="File not found")

    stat = os.stat(full_path)
    metadata = {
        "filename": os.path.basename(full_path),
        "size_bytes": stat.st_size,
        "modified_timestamp": stat.st_mtime,  # Unix epoch
        "mime_type": mimetypes.guess_type(full_path)[0] or "application/octet-stream",
    }

    return jsonify(metadata)


# delete
@fileBlueprint.route("/api/storage/file/delete/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_file(file_id):
    file = File.query.get(file_id)

    if not file:
        return jsonify({"message": "File not found"}), 404

    # Ownership/admin authorization: only admin or owner can delete
    current = get_jwt_identity()
    user = User.query.filter_by(username=current).first()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if not getattr(user, "is_admin", False) and file.owner_id != user.id:
        return jsonify({"message": "Not authorized"}), 403

    if os.path.exists(file.path):
        os.remove(file.path)

    db.session.delete(file)
    db.session.commit()

    return jsonify({"message": "Deleted successfully"})


# download
@fileBlueprint.route("/api/storage/file/download/<int:file_id>", methods=["GET"])
@jwt_required()
def download_file(file_id):
    file = File.query.get(file_id)
    try:
        # as_attachment=True forces the browser to download it instead of opening it
        return send_from_directory(
            "uploads",
            os.path.basename(file.path),
            as_attachment=True,
        )
    # except FileNotFoundError:
    except:
        return jsonify({"message": "File not found"}), 404


# rename
@fileBlueprint.route("/api/storage/file/rename/<fileID>", methods=["POST"])
@jwt_required()
def rename_file(fileID):
    full_path = os.path.join(
        "uploads", secure_filename(fileID)
    )

    if not os.path.isfile(full_path):
        return abort(404, description="File not found")

    jsonRequest = request.get_json()

    try:
        newFileName = jsonRequest["newFilename"]
        newFilePath = os.path.join(
            "uploads", secure_filename(newFileName)
        )
        os.rename(full_path, newFilePath)
    except:
        print("Rename failed? Do you need to add handling for the json?")
        raise

    # Update database record for this file if it exists
    db_file = File.query.filter_by(filename=fileID).first()
    if db_file:
        db_file.filename = secure_filename(newFileName)
        db_file.path = newFilePath
        db.session.commit()

    current = get_jwt_identity()
    logger.info(f"User {current} renamed file '{fileID}' to '{newFileName}'")
    return jsonify({"message": f'File "{fileID}" was renamed to "{newFileName}".'}),200


# upload
@fileBlueprint.route("/api/storage/file/upload", methods=["POST"])
@jwt_required()
def upload_file():
    # check if the post request has the file part
    if "file" not in request.files:
        return jsonify({"message": "No file part"}), 400

    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    file = request.files["file"]
    if file.filename == "" or file.filename == None:
        return jsonify({"message": "No selected file"}), 400

    # security measure to prevent directory traversal attacks
    filename = secure_filename(file.filename)

    # Optional folder — saves into a subfolder if provided
    # Strip path separators and traversal attempts but preserve spaces/original name
    folder = request.form.get("folder", "").strip().lstrip("/").replace("..", "")
    if folder and os.sep not in folder:
        upload_dir = os.path.join("uploads", folder)
        os.makedirs(upload_dir, exist_ok=True)
    else:
        upload_dir = "uploads"

    path = os.path.join(upload_dir, filename)

    file.save(path)

    # Set the owner of the uploaded file to the current authenticated user (if available)
    current_user = User.query.filter_by(username=get_jwt_identity()).first()
    new_file = File(
        filename=filename,
        path=path,
        size=os.path.getsize(path),
        owner_id=current_user.id if current_user else None,
    )

    db.session.add(new_file)
    db.session.commit()

    current = get_jwt_identity()
    logger.info(f"User {current} uploaded file '{filename}'")
    return jsonify({"message": f"Successfully uploaded {filename}"}), 200


# -----------------------------
# Get permissions for a file
# -----------------------------
@fileBlueprint.route("/api/storage/file/permissions", methods=["GET"])
@jwt_required()
def get_permissions():
    file_id = request.args.get("file_id", type=int)
    if not file_id:
        return jsonify({"message": "Missing file_id"}), 400

    file = File.query.get(file_id)
    if not file:
        return jsonify({"message": "File not found"}), 404

    current = get_jwt_identity()
    user = User.query.filter_by(username=current).first()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401

    # Only owner or admin can view permissions
    is_admin = getattr(user, "is_admin", False)
    if not is_admin and file.owner_id != user.id:
        return jsonify({"message": "Forbidden"}), 403

    perms = Permission.query.filter_by(file_id=file_id).all()
    result = []
    for p in perms:
        target = User.query.get(p.user_id)
        if target:
            result.append({
                "username": target.username,
                "read": p.permission_type in ("read", "write", "admin"),
                "write": p.permission_type in ("write", "admin"),
            })
    return jsonify(result), 200


# -----------------------------
# Set permission for a user on a file
# -----------------------------
@fileBlueprint.route("/api/storage/file/permissions/set", methods=["POST"])
@jwt_required()
def set_permission():
    data = request.get_json(silent=True) or {}
    file_id = data.get("file_id")
    username = (data.get("username") or "").strip()
    read = bool(data.get("read", False))
    write = bool(data.get("write", False))

    if not file_id or not username:
        return jsonify({"message": "Missing file_id or username"}), 400

    file = File.query.get(file_id)
    if not file:
        return jsonify({"message": "File not found"}), 404

    current = get_jwt_identity()
    user = User.query.filter_by(username=current).first()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401

    is_admin = getattr(user, "is_admin", False)
    if not is_admin and file.owner_id != user.id:
        return jsonify({"message": "Forbidden"}), 403

    target = User.query.filter_by(username=username).first()
    if not target:
        return jsonify({"message": "User not found"}), 404

    # Determine permission type
    if write:
        perm_type = "write"
    elif read:
        perm_type = "read"
    else:
        return jsonify({"message": "Must grant at least read or write"}), 400

    # Update existing or create new
    existing = Permission.query.filter_by(file_id=file_id, user_id=target.id).first()
    if existing:
        existing.permission_type = perm_type
    else:
        new_perm = Permission(file_id=file_id, user_id=target.id, permission_type=perm_type)
        db.session.add(new_perm)

    db.session.commit()
    return jsonify({"message": f"Permission set for {username}"}), 200


# -----------------------------
# Remove permission for a user on a file
# -----------------------------
@fileBlueprint.route("/api/storage/file/permissions/remove", methods=["POST"])
@jwt_required()
def remove_permission():
    data = request.get_json(silent=True) or {}
    file_id = data.get("file_id")
    username = (data.get("username") or "").strip()

    if not file_id or not username:
        return jsonify({"message": "Missing file_id or username"}), 400

    file = File.query.get(file_id)
    if not file:
        return jsonify({"message": "File not found"}), 404

    current = get_jwt_identity()
    user = User.query.filter_by(username=current).first()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401

    is_admin = getattr(user, "is_admin", False)
    if not is_admin and file.owner_id != user.id:
        return jsonify({"message": "Forbidden"}), 403

    target = User.query.filter_by(username=username).first()
    if not target:
        return jsonify({"message": "User not found"}), 404

    perm = Permission.query.filter_by(file_id=file_id, user_id=target.id).first()
    if perm:
        db.session.delete(perm)
        db.session.commit()

    return jsonify({"message": f"Permission removed for {username}"}), 200


# -----------------------------
# Get files shared with the current user
# -----------------------------
@fileBlueprint.route("/api/storage/file/shared", methods=["GET"])
@jwt_required()
def shared_files():
    current = get_jwt_identity()
    user = User.query.filter_by(username=current).first()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401

    # Admin sees all shared files
    if getattr(user, "is_admin", False):
        perms = Permission.query.all()
    else:
        perms = Permission.query.filter_by(user_id=user.id).all()

    result = []
    seen = set()
    for p in perms:
        if p.file_id in seen:
            continue
        seen.add(p.file_id)
        f = File.query.get(p.file_id)
        if f:
            owner = User.query.get(f.owner_id) if f.owner_id else None
            result.append({
                "id": f.id,
                "name": f.filename,
                "size": f.size,
                "read": p.permission_type in ("read", "write", "admin"),
                "write": p.permission_type in ("write", "admin"),
                "shared_by": owner.username if owner else "Unknown",
            })
    return jsonify(result), 200
