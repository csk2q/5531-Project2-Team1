import os

from flask import jsonify
from flask import Blueprint
import psutil

monitoringBlueprint = Blueprint("monitoring", __name__)

@monitoringBlueprint.route("/api/monitoring/cpu", methods=["GET"])
def cpu_usage():
    process = psutil.Process(os.getpid())
    return jsonify({'cpu_process_percent': process.cpu_percent(interval=0.1),
                    'cpu_system_percent': psutil.cpu_percent(interval=0.1)})
    
@monitoringBlueprint.route("/api/monitoring/memory", methods=["GET"])
def memory_usage():
    process = psutil.Process(os.getpid())
    pMem = process.memory_info()
    vm = psutil.virtual_memory()
    # rss = Resident Set Size
    # vms = Virtual Memory Size
    return jsonify({'process_rss': pMem.rss, 'process_vms': pMem.vms,
                    'system_total': vm.total, 'system_available': vm.available,
                    'system_used': vm.used, 'system_percent': vm.percent})
    
@monitoringBlueprint.route("/api/monitoring/storage", methods=["GET"])
def storage_usage():
    usage = psutil.disk_usage('.') # This gets the storage for the current system/drive
    return jsonify({'total': usage.total, 'used': usage.used,
                    'free': usage.free, 'percent': usage.percent})

