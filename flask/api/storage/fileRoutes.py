import mimetypes
import os
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

from db import db
from models import File

fileBlueprint = Blueprint("fileRoutes", __name__)

# about
@fileBlueprint.route("/api/storage/file/about/<fileID>", methods=["GET"])
def about_file(fileID):
    # Full absolute path
    full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(fileID))

    if not os.path.isfile(full_path):
        return abort(404, description="File not found")

    stat = os.stat(full_path)
    metadata = {
        "filename": os.path.basename(full_path),
        "size_bytes": stat.st_size,
        "modified_timestamp": stat.st_mtime,   # Unix epoch
        "mime_type": mimetypes.guess_type(full_path)[0] or "application/octet-stream",
    }

    return jsonify(metadata)

# delete
@fileBlueprint.route("/api/storage/file/delete/<int:file_id>", methods=["DELETE"])
def delete_file(file_id):
    file = File.query.get(file_id)

    if not file:
        return jsonify({"message": "File not found"}), 404

    if os.path.exists(file.path):
        os.remove(file.path)

    db.session.delete(file)
    db.session.commit()

    return jsonify({"message": "Deleted successfully"})

# download
@fileBlueprint.route("/api/storage/file/download/<int:file_id>", methods=["GET"])
def download_file(file_id):
    file = File.query.get(file_id)
    try:
        # as_attachment=True forces the browser to download it instead of opening it
        return send_from_directory(current_app.config['UPLOAD_FOLDER'], file.path, as_attachment=True)
    # except FileNotFoundError:
    except:
        return jsonify({"message": "File not found"}), 404
    
# rename
@fileBlueprint.route("/api/storage/file/rename/<fileID>", methods=["POST"])
def rename_file(fileID):
    full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(fileID))

    if not os.path.isfile(full_path):
        return abort(404, description="File not found")
    
    jsonRequest = request.get_json()

    try:
        newFileName = jsonRequest['newFilename']
        newFilePath = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(newFileName))
        os.rename(full_path, newFilePath)
    except:
        print('Rename failed? Do you need to add handling for the json?')
        raise

    return jsonify({'message':f'File "{fileID}" was renamed to "{newFileName}".'})

# upload
@fileBlueprint.route("/api/storage/file/upload", methods=["POST"])
def upload_file():
    print(request)

    # check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    
    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    file = request.files['file']
    if file.filename == '' or file.filename == None:
        return jsonify({"message": "No selected file"}), 400

    # security measure to prevent directory traversal attacks
    filename = secure_filename(file.filename)

    path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)

    file.save(path)

    new_file = File(
        filename=filename,
        path=path,
        size=os.path.getsize(path)
    )

    db.session.add(new_file)
    db.session.commit()
    
    return jsonify({"message": f"Successfully uploaded {filename}"}), 200

