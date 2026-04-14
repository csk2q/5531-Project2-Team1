from datetime import timedelta
from typing import Any, Dict, Optional

from db import db
from flask_jwt_extended import create_access_token
from models import User
from sqlalchemy.exc import IntegrityError

from flask import current_app, jsonify, request

from . import authBlueprint


def _get_expires_seconds() -> int:
    """
    Resolve JWT access token expiration (in seconds).
    Flask-JWT-Extended expects a timedelta in JWT_ACCESS_TOKEN_EXPIRES; fall back to 1 hour.
    """
    value = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", timedelta(hours=1))
    if isinstance(value, timedelta):
        return int(value.total_seconds())
    # If configured as an int/float in seconds
    try:
        return int(value)  # type: ignore[arg-type]
    except Exception:
        return 3600


@authBlueprint.route("/register", methods=["POST"])
def register() -> Any:
    """
    POST /api/auth/register
    Registers a new user and returns a JWT access token.

    Request JSON:
      {
        "username": "string (required, unique)",
        "password": "string (required)"
      }

    Responses:
      201 Created:
        {
          "message": "User created",
          "access_token": "<jwt>",
          "token_type": "Bearer",
          "expires_in": 3600,
          "user": { "id": 1, "username": "alice" }
        }
      400 Bad Request: Missing or invalid input
      409 Conflict: User already exists
      500 Internal Server Error: Database or unexpected error
    """
    data: Dict[str, Optional[str]] = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400

    # Basic input constraints (can be adjusted to your policy)
    if len(username) < 3:
        return jsonify({"message": "Username must be at least 3 characters"}), 400
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    # Ensure uniqueness
    if User.query.filter_by(username=username).first() is not None:
        return jsonify({"message": "User already exists"}), 409

    # Create user (first user becomes admin)
    is_first_user = User.query.count() == 0
    user = User(username=username, is_admin=is_first_user)
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "User already exists"}), 409
    except Exception as exc:
        db.session.rollback()
        return jsonify({"message": "Failed to create user", "error": str(exc)}), 500

    # Issue JWT (use username as identity for consistency with existing login flow)
    access_token = create_access_token(identity=user.username)
    response = {
        "message": "User created",
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": _get_expires_seconds(),
        "user": {"id": user.id, "username": user.username},
    }
    return jsonify(response), 201
