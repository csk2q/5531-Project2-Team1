import mimetypes
import os
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

fileRenameRoute = Blueprint("fileRenameRoute", __name__)

@fileRenameRoute.route("/api/storage/file/rename/<fileID>", methods=["POST"])
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

    # try:
    #     # as_attachment=True forces the browser to download it instead of opening it
    #     return send_from_directory(current_app.config['UPLOAD_FOLDER'], fileID, as_attachment=True)
    # except FileNotFoundError:
    #     return jsonify({"message": "File not found"}), 404
