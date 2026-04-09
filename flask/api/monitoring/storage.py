import os

import psutil
from flask_cors import CORS

from flask import Blueprint, jsonify

routeStorage = Blueprint("routeStorage", __name__)

@routeStorage.route("/api/monitoring/storage", methods=["GET"])
def storage_usage():
    usage = psutil.disk_usage('.') # This gets the storage for the current system/drive
    return jsonify({'total': usage.total, 'used': usage.used,
                    'free': usage.free, 'percent': usage.percent})