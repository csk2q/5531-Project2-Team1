import os
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

fileDeleteRoute = Blueprint("fileDeleteRoute", __name__)

@fileDeleteRoute.route("/api/storage/file/delete/<fileID>", methods=["POST"])
def delete_file(fileID):
    try:
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], fileID)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": f"{fileID} deleted successfully"}), 200
        else:
            return jsonify({"message": "File not found"}), 404
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
