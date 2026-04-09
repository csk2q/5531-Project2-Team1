import os

from flask import jsonify
from flask_cors import CORS
from flask import Blueprint
import psutil


routeCPU = Blueprint("routeCPU", __name__)

@routeCPU.route("/api/monitoring/cpu", methods=["GET"])
def cpu_usage():
    process = psutil.Process(os.getpid())
    return jsonify({'cpu_process_percent': process.cpu_percent(interval=0.1),
                    'cpu_system_percent': psutil.cpu_percent(interval=0.1)})
    
