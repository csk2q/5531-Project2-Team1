import mimetypes
import os
from pathlib import Path
from flask import Flask, request, jsonify, redirect, url_for, flash, current_app, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

from flask import Blueprint

from models import File

from api.maintenance._backup import backupFull, backupFolder, restoreFull

backupBlueprint = Blueprint("backupRoutes", __name__, url_prefix="/api/maintenance/backup")

### TODO: These functions will need checks that the user is admin.


# list
@backupBlueprint.route("/list", methods=["GET"])
def list_backups():
    # pattern = r'^backup-\d{8}_\d{6}_\d{6}Z\.zip$' # The number of digits might be incorrect.
    backupZips = [backupZip for backupZip in os.listdir(backupFolder) 
                  if backupZip.startswith('backup-') and backupZip.endswith('.zip')]
    
    return jsonify({"backups": backupZips})

# start
@backupBlueprint.route("/start", methods=["POST"])
def start_backup():
    success, backupZipPath = backupFull()

    if (success):
        return jsonify({'message': 'Backup successful', 'path': str(backupZipPath)})
    else:
        return jsonify({'message': 'Backup failed!', 'errorMessage': backupZipPath}), 500

# restore
@backupBlueprint.route("/restore/<string:backup_filename>", methods=["POST"])
def restore_backup(backup_filename):
    file = secure_filename(backup_filename)
    if file.startswith('\\') or file.startswith('/'):
        file = file[1:]
    backupPath = Path(backupFolder, file)

    if not os.path.exists(backupPath):
        return jsonify({"message": "Backup not found"}), 404

    try:
        restoreFull(file)
        return jsonify({"message": f'Successfully restored from backup "{file}"'})
    except Exception as e:
        return jsonify({"message": f'Restore failed!', 'error': e}), 500

# delete
@backupBlueprint.route("/delete/<string:backup_filename>", methods=["DELETE"])
def delete_backup(backup_filename):
    file = secure_filename(backup_filename)
    if file.startswith('\\') or file.startswith('/'):
        file = file[1:]
    backupZip = Path(backupFolder, file)

    if os.path.exists(backupZip):
        os.remove(backupZip)
    else:
        return jsonify({"message": f"Backup file {file} not found"}), 404

    return jsonify({"message": f'Backup "{file}" deleted successfully!'})

# upload
@backupBlueprint.route("/upload", methods=["POST"])
def upload_backup():
    # check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    
    # If the user does not select a file, the browser submits an empty file without a filename.
    file = request.files['file']
    if file.filename == '' or file.filename == None:
        return jsonify({"message": "No selected file"}), 400

    filename = secure_filename(file.filename)
    
    if not (filename.startswith('backup-') and filename.endswith('.zip')):
        return jsonify({"message": f'The file "{filename}" is not a backup zip file!'}), 400

    path = os.path.join(backupFolder, filename)

    if os.path.exists(path):
        return jsonify({"message": f'The file "{filename}" already exists on the server. Delete it before uploading again.'}), 500

    file.save(path)

    return jsonify({"message": f'Successfully uploaded backup "{filename}"'}), 200

# download backup
@backupBlueprint.route("/download/<string:file_id>", methods=["GET"])
def download_backup(backupName):
    try:
        return send_from_directory(backupFolder, secure_filename(backupName), as_attachment=True)
    except FileNotFoundError:
        return jsonify({"message": f"The backup file \"{secure_filename(backupName)}\" was not found"}), 404
