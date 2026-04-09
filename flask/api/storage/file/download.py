import os
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

from app import File, db

fileDownloadRoute = Blueprint("fileDownloadRoute", __name__)

@fileDownloadRoute.route("/download/<int:file_id>", methods=["GET"])
def download_file(file_id):
    file = File.query.get(file_id)
    try:
        # as_attachment=True forces the browser to download it instead of opening it
        return send_from_directory(current_app.config['UPLOAD_FOLDER'], file.path, as_attachment=True)
    # except FileNotFoundError:
    except:
        return jsonify({"message": "File not found"}), 404
