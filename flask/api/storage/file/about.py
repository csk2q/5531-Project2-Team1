import mimetypes
import os
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

fileAboutRoute = Blueprint("fileAboutRoute", __name__)

@fileAboutRoute.route("/api/storage/file/about/<fileID>", methods=["GET"])
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

    # try:
    #     # as_attachment=True forces the browser to download it instead of opening it
    #     return send_from_directory(current_app.config['UPLOAD_FOLDER'], fileID, as_attachment=True)
    # except FileNotFoundError:
    #     return jsonify({"message": "File not found"}), 404
