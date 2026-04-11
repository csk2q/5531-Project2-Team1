import os
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

from models import File

folderBlueprint = Blueprint("folderListHomeRoute", __name__)

# Lists all files and folders in a given folder
@folderBlueprint.route("/api/storage/folder/list/<folderID>", methods=["GET"])
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

# Lists all files and folders in the user's home folder
@folderBlueprint.route("/api/storage/folder/list", methods=["GET"])
def list_files():
    files = os.listdir(current_app.config['UPLOAD_FOLDER'])
    return jsonify({"files": files})



