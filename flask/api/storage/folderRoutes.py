import os

from flask_cors import CORS
from flask_jwt_extended import jwt_required
from models import File
from werkzeug.utils import secure_filename

from flask import (
    Blueprint,
    Flask,
    current_app,
    flash,
    jsonify,
    redirect,
    request,
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
