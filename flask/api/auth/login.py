from datetime import timedelta
from typing import Optional

from flask_jwt_extended import create_access_token
from models import User

from flask import current_app, jsonify, request

# Use the shared auth blueprint defined in this package's __init__.py
from . import authBlueprint


def _expires_in_seconds() -> Optional[int]:
    """
    Determine access token expiration in seconds.

    Flask-JWT-Extended allows JWT_ACCESS_TOKEN_EXPIRES to be a timedelta or int (seconds).
    If not configured, the library defaults to 15 minutes. We reflect that here for clients.
    """
    value = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", None)
    if value is None:
        # Flask-JWT-Extended default is 15 minutes
        return 15 * 60
    if isinstance(value, int):
        return value
    if isinstance(value, timedelta):
        return int(value.total_seconds())
    # Unknown type; omit to avoid misleading clients
    return None


@authBlueprint.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Request JSON:
      {
        "username": "string (required)",
        "password": "string (required)"
      }

    Responses:
      200 OK:
        {
          "access_token": "<jwt>",
          "token_type": "Bearer",
          "expires_in": <seconds>,
          "user": { "id": <int>, "username": "<str>" }
        }
      400 Bad Request: Missing inputs or invalid JSON
      401 Unauthorized: Invalid credentials
    """
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Missing 'username' or 'password'."}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        # Avoid username enumeration by returning a generic error
        return jsonify({"message": "Invalid credentials."}), 401

    # Use username as identity for continuity with existing routes
    access_token = create_access_token(identity=user.username)

    response = {
        "access_token": access_token,
        "token_type": "Bearer",
        "user": {"id": user.id, "username": user.username},
    }

    exp = _expires_in_seconds()
    if exp is not None:
        response["expires_in"] = exp

    return jsonify(response), 200
