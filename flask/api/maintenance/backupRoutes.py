import mimetypes
import os
from pathlib import Path
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

from db import db
from models import File

from api.maintenance._backup import backupSqlite, backupFolder


### TODO: These functions will need checks that the user is admin.

backupBlueprint = Blueprint("backupRoutes", __name__)

# list
@backupBlueprint.route("/api/maintenance/backup/list", methods=["GET"])
def list_backups():
    # pattern = r'^backup-\d{8}_\d{6}_\d{6}Z\.zip$'
    backupZips = [backupZip for backupZip in os.listdir(backupFolder) 
                  if backupZip.startswith('backup-') and backupZip.endswith('.zip')]
    
    return jsonify({"backups": backupZips})

# start
@backupBlueprint.route("/api/maintenance/backup/start", methods=["POST"])
def start_backup():
    success, backupZipPath = backupSqlite()

    if (success):
        return jsonify({'message': 'Backup successful', 'path': str(backupZipPath)})
    else:
        return jsonify({'message': 'Backup failed!', 'errorMessage': backupZipPath}), 500

# restore
# TODO NotYetImplemented

# delete
@backupBlueprint.route("/api/maintenance/backup/delete/<int:backup_filename>", methods=["DELETE"])
def delete_file(backup_filename):
    file = secure_filename(backup_filename)
    if file.startswith('\\') or file.startswith('/'):
        file = file[1:]

    if not file:
        return jsonify({"message": "Backup not found"}), 404

    if os.path.exists(file):
        os.remove(file)

    db.session.delete(file)
    db.session.commit()

    return jsonify({"message": f'Backup "{file}" deleted successfully!'})

# upload
@backupBlueprint.route("/api/maintenance/backup/upload")
def upload_backup():
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
    
    if not (filename.startswith('backup-') and filename.endswith('.zip')):
        return jsonify({"message": f'The file "{filename}" is not a backup zip file!'}), 400

    path = os.path.join(backupFolder, filename)

    file.save(path)

    return jsonify({"message": f'Successfully uploaded backup "{filename}"'}), 200
