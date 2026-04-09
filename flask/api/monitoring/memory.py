import os

import psutil
from flask_cors import CORS

from flask import Blueprint, jsonify

routeMemory = Blueprint("routeMemory", __name__)

@routeMemory.route("/api/monitoring/memory", methods=["GET"])
def memory_usage():
    process = psutil.Process(os.getpid())
    pMem = process.memory_info()
    vm = psutil.virtual_memory()
    # rss = Resident Set Size
    # vms = Virtual Memory Size
    return jsonify({'process_rss': pMem.rss, 'process_vms': pMem.vms,
                    'system_total': vm.total, 'system_available': vm.available,
                    'system_used': vm.used, 'system_percent': vm.percent})
    
