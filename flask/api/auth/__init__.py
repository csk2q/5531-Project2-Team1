"""
Auth blueprint package initializer.

This module defines the `authBlueprint` Blueprint and imports the route modules
(e.g., `login.py`, `register.py`) so their route handlers are registered on this
blueprint at import time.

Usage:
    from api.auth import authBlueprint
    app.register_blueprint(authBlueprint)
"""

from flask import Blueprint

# All auth routes will be prefixed with /api/auth
authBlueprint = Blueprint("auth", __name__, url_prefix="/api/auth")

# Import routes to register them with the blueprint.
# These modules should import `authBlueprint` from this package and
# attach routes using `@authBlueprint.route(...)`.
from . import (
    login,  # noqa: F401
    register,  # noqa: F401
)

__all__ = ["authBlueprint"]
