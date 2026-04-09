import os
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

from app import File, db

fileUploadRoute = Blueprint("fileUploadRoute", __name__)

@fileUploadRoute.route("/api/storage/file/upload", methods=["POST"])
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



