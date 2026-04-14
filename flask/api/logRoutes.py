import logging
import os
import queue
from logging import getLogger

from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required

## Logging ##

import logging
import queue
import sys

# thread-safe queue storing recent log messages
log_queue = queue.Queue(maxsize=1000)

class QueueHandler(logging.Handler):
    def emit(self, record):
        try:
            msg = self.format(record)
            # non-blocking put: drop oldest if full
            if log_queue.full():
                try:
                    _ = log_queue.get_nowait()
                except Exception:
                    pass
            log_queue.put_nowait(msg)
        except Exception:
            pass

# Configure root logger once (import this module early)
root = logging.getLogger()
root.setLevel(logging.INFO)

# 1) Console/stream handler (keeps existing console output)
stream_handler = logging.StreamHandler(stream=sys.stdout)
stream_fmt = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
stream_handler.setFormatter(stream_fmt)
stream_handler.setLevel(logging.INFO)
root.addHandler(stream_handler)

# 2) Queue handler (for polling endpoint)
queue_handler = QueueHandler()
queue_handler.setFormatter(stream_fmt)  # same format for consistency
queue_handler.setLevel(logging.INFO)
root.addHandler(queue_handler)


## Routes ##

loggingBlueprint = Blueprint('loggingRoutes', __name__, url_prefix='/api/monitoring/logs')

# Polling endpoint: returns new logs since last seen index
@loggingBlueprint.route('/poll', methods=['GET'])
def poll_logs():
    """
    Query params:
      - since (int): index of last-seen message (default 0)
      - limit (int): max messages to return (default 100)
    Response JSON:
      { "next": <next_index>, "logs": [ ... ] }
    """
    try:
        since = int(request.args.get('since', '0'))
    except ValueError:
        since = 0
    try:
        limit = min(int(request.args.get('limit', '100')), 1000)
    except ValueError:
        limit = 100

    # We will copy queue contents into a list and use stable indexing.
    # Note: queue.Queue does not support direct indexing, so convert to list.
    items = list(log_queue.queue)  # direct access to underlying deque
    total = len(items)
    if since < 0:
        since = 0
    if since >= total:
        return jsonify({"next": total, "logs": []})
    end = min(total, since + limit)
    batch = items[since:end]
    return jsonify({"next": end, "logs": batch})


# download
@loggingBlueprint.route("/download", methods=["GET"])
@jwt_required()
def download_file(file_id):
    try:
        return send_from_directory(
            '.',
            os.path.basename('server.log'),
            as_attachment=True,
        )
    except:
        return jsonify({"message": "File not found"}), 404