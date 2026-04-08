import os
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

fileDownloadRoute = Blueprint("fileDownloadRoute", __name__)

@fileDownloadRoute.route("/api/storage/file/download/<fileID>", methods=["GET"])
def download_file(fileID):
    try:
        # as_attachment=True forces the browser to download it instead of opening it
        return send_from_directory(current_app.config['UPLOAD_FOLDER'], fileID, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"message": "File not found"}), 404
