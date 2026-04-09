import os
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

folderListHomeRoute = Blueprint("folderListHomeRoute", __name__)

# Lists all files and folders in the user's home folder
@folderListHomeRoute.route("/api/storage/folder/list", methods=["GET"])
def list_files():
    files = os.listdir(current_app.config['UPLOAD_FOLDER'])
    return jsonify({"files": files})


