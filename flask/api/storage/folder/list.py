import os
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

from models import File

folderListRoute = Blueprint("folderListRoute", __name__)

# Lists all files and folders in a given folder
@folderListRoute.route("/api/storage/folder/list/<folderID>", methods=["GET"])
def list_folder_files(folderID):
    files = File.query.all()

    return jsonify([
        {
            "id": f.id,
            "name": f.filename,
            "size": f.size
        }
        for f in files
    ])

## Old version that does not use the database
# def list_files(folderID):
#     print(f"Folder ID {folderID}")
#     files = os.listdir(current_app.config['UPLOAD_FOLDER'])
#     return jsonify({"files": files})


