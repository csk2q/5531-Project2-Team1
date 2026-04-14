import os
import shutil
import tempfile
from pathlib import Path

from db import db
from flask_cors import CORS
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import File, Folder, Permission, User
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
    send_file,
    send_from_directory,
    url_for,
)

folderBlueprint = Blueprint("folderListHomeRoute", __name__)


# Lists all files and folders in a given folder
@folderBlueprint.route("/api/storage/folder/list/<folderID>", methods=["GET"])
@jwt_required()
def list_folder_files(folderID):
    files = File.query.all()

    return jsonify([{"id": f.id, "name": f.filename, "size": f.size} for f in files])


# Lists all files and folders in the user's home folder
@folderBlueprint.route("/api/storage/folder/list", methods=["GET"])
@jwt_required()
def list_files():
    files = os.listdir(current_app.config["UPLOAD_FOLDER"])
    return jsonify({"files": files})


# -----------------------------
# Helpers for safe path handling
# -----------------------------
def _base_dir() -> Path:
    return Path(current_app.config["UPLOAD_FOLDER"]).resolve()


def _safe_path(rel_path: str) -> Path:
    """
    Resolve a relative path under the UPLOAD_FOLDER safely.
    Rejects traversal outside of the base directory.
    """
    base = _base_dir()
    # Normalize path; allow nested paths like "sub/dir"
    rel_path = (rel_path or "").strip().lstrip("/")

    target = (base / rel_path).resolve()
    if not str(target).startswith(str(base)):
        abort(400, description="Invalid path")
    return target


# ------------------------------------------
# Authorization helpers and permission checks
# ------------------------------------------
def _get_current_user() -> User:
    """
    Resolve the current authenticated user from the JWT identity.
    Returns a User row or aborts with 401 if not found.
    """
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        abort(401, description="Unauthorized")
    return user


def _is_admin(user: User) -> bool:
    """
    Returns True if the user has admin privileges.
    """
    return bool(getattr(user, "is_admin", False))


def _find_folder_record(rel_path: str):
    """
    Try to find a Folder DB record by using the final path component as the folder name.
    Note: This is a best-effort lookup since the DB schema stores only name/parent links.
    """
    name = os.path.basename((rel_path or "").strip().rstrip(os.sep))
    if not name:
        return None
    return Folder.query.filter_by(name=name).first()


def _has_folder_permission(user: User, folder: Folder, action: str) -> bool:
    """
    Check if the user is authorized for the given action against a Folder record.
    - Admins are always authorized.
    - Owners are authorized.
    - Otherwise, check for file-level permissions on any file directly in that folder:
      * read: any of ['read', 'write', 'admin']
      * write: any of ['write', 'admin']
    """
    if _is_admin(user):
        return True
    if folder and folder.owner_id == user.id:
        return True

    allowed_map = {
        "read": ["read", "write", "admin"],
        "write": ["write", "admin"],
    }
    allowed = allowed_map.get(action, [])

    if folder:
        # Gather file IDs in this folder and see if the user has any permission entries
        file_ids = [f.id for f in File.query.filter_by(folder_id=folder.id).all()]
        if file_ids:
            perm = Permission.query.filter(
                Permission.user_id == user.id,
                Permission.file_id.in_(file_ids),
                Permission.permission_type.in_(allowed),
            ).first()
            if perm:
                return True
    return False


def _authorize_by_path(action: str, rel_path: str, user: User) -> bool:
    """
    Convenience method to authorize an action by resolving a folder record via path.
    """
    folder = _find_folder_record(rel_path)
    return _has_folder_permission(user, folder, action)
return target


# ------------------------------------------
# Authorization helpers and permission checks
# ------------------------------------------
def _get_current_user() -> User:
"""
Resolve the current authenticated user from the JWT identity.
Returns a User row or aborts with 401 if not found.
"""
username = get_jwt_identity()
user = User.query.filter_by(username=username).first()
if not user:
    abort(401, description="Unauthorized")
return user


def _is_admin(user: User) -> bool:
"""
Returns True if the user has admin privileges.
"""
return bool(getattr(user, "is_admin", False))


def _find_folder_record(rel_path: str):
"""
Try to find a Folder DB record by using the final path component as the folder name.
Note: This is a best-effort lookup since the DB schema stores only name/parent links.
"""
name = os.path.basename((rel_path or "").strip().rstrip(os.sep))
if not name:
    return None
return Folder.query.filter_by(name=name).first()


def _has_folder_permission(user: User, folder: Folder, action: str) -> bool:
"""
Check if the user is authorized for the given action against a Folder record.
- Admins are always authorized.
- Owners are authorized.
- Otherwise, check for file-level permissions on any file directly in that folder:
  * read: any of ['read', 'write', 'admin']
  * write: any of ['write', 'admin']
"""
if _is_admin(user):
    return True
if folder and folder.owner_id == user.id:
    return True

allowed_map = {
    "read": ["read", "write", "admin"],
    "write": ["write", "admin"],
}
allowed = allowed_map.get(action, [])

if folder:
    # Gather file IDs in this folder and see if the user has any permission entries
    file_ids = [f.id for f in File.query.filter_by(folder_id=folder.id).all()]
    if file_ids:
        perm = Permission.query.filter(
            Permission.user_id == user.id,
            Permission.file_id.in_(file_ids),
            Permission.permission_type.in_(allowed),
        ).first()
        if perm:
            return True
return False


def _authorize_by_path(action: str, rel_path: str, user: User) -> bool:
"""
Convenience method to authorize an action by resolving a folder record via path.
"""
folder = _find_folder_record(rel_path)
return _has_folder_permission(user, folder, action)


# -----------------------------
# Create a folder
# -----------------------------
@folderBlueprint.route("/api/storage/folder/create", methods=["POST"])
@jwt_required()
def create_folder():
    """
    Create a folder on disk under UPLOAD_FOLDER and record it in the DB.
    Request JSON:
      - path: required, relative path to create (e.g., "projects/new-folder")
      - parent_id: optional, DB ID of the parent Folder (authorization enforced)
      - folder_id: optional, explicit DB primary key to set (use with caution)
    Behavior:
      - Sets owner_id to the current authenticated user.
      - Authorization: if parent_id is provided, requires write permission on parent or admin.
    """
    data = request.get_json(silent=True) or {}
    path = (data.get("path") or "").strip()
    parent_id = data.get("parent_id")
    explicit_id = data.get("folder_id")

    if not path:
        return jsonify({"message": "Missing 'path' for folder creation"}), 400

    # Current user context
    user = _get_current_user()

    # If a parent is specified, enforce permission to write under that parent
    if parent_id:
        parent = Folder.query.get(parent_id)
        if not parent:
            return jsonify({"message": "Parent folder not found"}), 404
        if not _has_folder_permission(user, parent, "write"):
            return jsonify({"message": "Forbidden"}), 403

    # Create directory on disk
    # Authorization: must be owner/admin or have write permission on the folder
    user = _get_current_user()
    if not _authorize_by_path("write", path, user):
        return jsonify({"message": "Forbidden"}), 403
    target = _safe_path(path)
    try:
        target.mkdir(parents=True, exist_ok=False)
    except FileExistsError:
        return jsonify({"message": "Folder already exists"}), 409
    except Exception as exc:
        return jsonify({"message": "Failed to create folder", "error": str(exc)}), 500

    # Record in DB with ownership set to current user
    folder_rec = Folder(
        name=os.path.basename(path), owner_id=user.id, parent_id=parent_id
    )
    if explicit_id is not None:
        # Allow explicitly setting the primary key if provided (may fail if conflicts)
        try:
            folder_rec.id = int(explicit_id)
        except Exception:
            return jsonify({"message": "Invalid folder_id"}), 400

    try:
        db.session.add(folder_rec)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        # Folder exists on disk but DB insert failed; return 500 with details
        return jsonify(
            {
                "message": "Folder created on disk, but DB insert failed",
                "error": str(exc),
            }
        ), 500

    return jsonify(
        {
            "message": "Folder created",
            "path": str(target.relative_to(_base_dir())),
            "folder_id": folder_rec.id,
            "owner_id": folder_rec.owner_id,
        }
    ), 201


# -----------------------------
# Rename a folder
# -----------------------------
@folderBlueprint.route("/api/storage/folder/rename", methods=["POST"])
@jwt_required()
def rename_folder():
    data = request.get_json(silent=True) or {}
    path = (data.get("path") or "").strip()
    new_name = (data.get("new_name") or "").strip()

    if not path or not new_name:
        return jsonify({"message": "Missing 'path' or 'new_name'"}), 400
    if (
        new_name in ("", ".", "..")
        or (os.sep in new_name)
        or (os.altsep and os.altsep in new_name)
    ):
        return jsonify({"message": "Invalid new_name"}), 400

    # Authorization: must be owner/admin or have write permission on the folder
    user = _get_current_user()
    if not _authorize_by_path("write", path, user):
        return jsonify({"message": "Forbidden"}), 403
    src = _safe_path(path)
    if not src.exists() or not src.is_dir():
        return jsonify({"message": "Folder not found"}), 404

    dst = src.parent / new_name
    # Ensure destination remains within base dir
    try:
        rel_dst = str(dst.resolve().relative_to(_base_dir()))
    except Exception:
        return jsonify({"message": "Invalid destination"}), 400

    try:
        src.rename(dst)
    except FileExistsError:
        return jsonify({"message": "Destination already exists"}), 409
    except Exception as exc:
        return jsonify({"message": "Failed to rename folder", "error": str(exc)}), 500

    return jsonify({"message": "Folder renamed", "path": rel_dst}), 200


# -----------------------------
# Delete a folder
# -----------------------------
@folderBlueprint.route("/api/storage/folder/delete", methods=["POST"])
@jwt_required()
def delete_folder():
    data = request.get_json(silent=True) or {}
    path = (data.get("path") or "").strip()
    recursive = bool(data.get("recursive", False))

    if not path:
        return jsonify({"message": "Missing 'path'"}), 400

    # Authorization: write permission (owner/admin or granted) required to delete
    user = _get_current_user()
    if not _authorize_by_path("write", path, user):
        return jsonify({"message": "Forbidden"}), 403

    target = _safe_path(path)
    if not target.exists() or not target.is_dir():
        return jsonify({"message": "Folder not found"}), 404

    try:
        if recursive:
            shutil.rmtree(target)
        else:
            # Only remove if empty
            os.rmdir(target)
    except OSError as exc:
        # Typically raised if directory is not empty when not recursive
        return jsonify({"message": "Failed to delete folder", "error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"message": "Failed to delete folder", "error": str(exc)}), 500

    return jsonify({"message": "Folder deleted"}), 200


# -----------------------------
# Download a folder (zip)
# -----------------------------
@folderBlueprint.route("/api/storage/folder/download", methods=["GET"])
@jwt_required()
def download_folder():
    rel_path = (request.args.get("path") or "").strip()
    if not rel_path:
        return jsonify({"message": "Missing 'path'"}), 400

    # Authorization: must be owner/admin or have read permission on the folder
    user = _get_current_user()
    if not _authorize_by_path("read", rel_path, user):
        return jsonify({"message": "Forbidden"}), 403
    target = _safe_path(rel_path)
    if not target.exists() or not target.is_dir():
        return jsonify({"message": "Folder not found"}), 404

    # Create a temporary zip archive for the folder
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            base_name = os.path.join(tmpdir, target.name)
            archive_path = shutil.make_archive(
                base_name, "zip", root_dir=target, base_dir="."
            )
            return send_file(
                archive_path,
                as_attachment=True,
                download_name=f"{target.name}.zip",
            )
    except Exception as exc:
        return jsonify({"message": "Failed to create archive", "error": str(exc)}), 500


# -----------------------------
# List folder contents (files and subfolders)
# -----------------------------
@folderBlueprint.route("/api/storage/folder/contents", methods=["GET"])
@jwt_required()
def folder_contents():
    rel_path = (request.args.get("path") or "").strip()
    # Authorization: for a specific folder, require read; for root, require admin
    user = _get_current_user()
    if rel_path:
        if not _authorize_by_path("read", rel_path, user):
            return jsonify({"message": "Forbidden"}), 403
    else:
        if not _is_admin(user):
            return jsonify({"message": "Forbidden (admin required for root view)"}), 403
    # Authorization: for a specific folder, require read; for root, require admin
    user = _get_current_user()
    if rel_path:
        if not _authorize_by_path("read", rel_path, user):
            return jsonify({"message": "Forbidden"}), 403
    else:
        if not _is_admin(user):
            return jsonify({"message": "Forbidden (admin required for root info)"}), 403
    directory = _safe_path(rel_path) if rel_path else _base_dir()

    if not directory.exists() or not directory.is_dir():
        return jsonify({"message": "Folder not found"}), 404

    items = []
    try:
        for entry in os.scandir(directory):
            info = {
                "name": entry.name,
                "is_dir": entry.is_dir(),
            }
            if entry.is_file():
                try:
                    info["size"] = entry.stat().st_size
                except Exception:
                    info["size"] = None
            items.append(info)
    except Exception as exc:
        return jsonify({"message": "Failed to read directory", "error": str(exc)}), 500

    return jsonify(
        {"path": str(directory.relative_to(_base_dir())), "items": items}
    ), 200


# -----------------------------
# Folder metadata (about)
# -----------------------------
@folderBlueprint.route("/api/storage/folder/about", methods=["GET"])
@jwt_required()
def folder_about():
    rel_path = (request.args.get("path") or "").strip()
    # Authorization: read access for a specific folder, admin for root info
    user = _get_current_user()
    if rel_path:
        if not _authorize_by_path("read", rel_path, user):
            return jsonify({"message": "Forbidden"}), 403
    else:
        if not _is_admin(user):
            return jsonify({"message": "Forbidden (admin required for root info)"}), 403
    directory = _safe_path(rel_path) if rel_path else _base_dir()

    if not directory.exists() or not directory.is_dir():
        return jsonify({"message": "Folder not found"}), 404

    total_size = 0
    file_count = 0
    folder_count = 0
    try:
        for root, dirs, files in os.walk(directory):
            folder_count += len(dirs)
            file_count += len(files)
            for f in files:
                try:
                    fp = Path(root) / f
                    total_size += fp.stat().st_size
                except Exception:
                    pass
        mtime = directory.stat().st_mtime
    except Exception as exc:
        return jsonify(
            {"message": "Failed to compute folder info", "error": str(exc)}
        ), 500

    return jsonify(
        {
            "path": str(directory.relative_to(_base_dir())),
            "total_size": total_size,
            "file_count": file_count,
            "folder_count": folder_count,
            "modified_timestamp": mtime,
        }
    ), 200
