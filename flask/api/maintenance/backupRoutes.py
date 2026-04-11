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

from api.maintenance._backup import backupSqlite

backupBlueprint = Blueprint("backupRoutes", __name__)

# list

# start
@backupBlueprint.route("/api/maintenance/backup/start", methods=["POST"])
def start_backup():
    success, backupZipPath = backupSqlite()

    if (success):
        return jsonify({'message': 'Backup successful', 'path': str(backupZipPath)})
    else:
        return jsonify({'message': 'Backup failed!', 'errorMessage': backupZipPath}), 500

# restore
# remove


