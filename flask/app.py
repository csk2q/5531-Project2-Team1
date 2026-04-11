import os

from flask import Flask, jsonify, request

from db import db
from flask_cors import CORS
from models import File, User
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

db.init_app(app)
with app.app_context():
    db.create_all()  # creates app.db + tables


@app.route("/")
def home():
    return "Backend is running!"


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data or not data.get("username") or not data.get("password"):
        return jsonify({"message": "Missing username or password"}), 400

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"message": "User already exists"}), 400

    user = User(username=data["username"])
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created"}), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    user = User.query.filter_by(username=data.get("username")).first()

    if user and user.check_password(data.get("password")):
        return jsonify({"message": "Login successful"})

    return jsonify({"message": "Invalid credentials"}), 401



# Register routes from blueprints #

# Register file routes
from api.storage.fileRoutes import fileBlueprint
app.register_blueprint(fileBlueprint)

# Register folder routes
from api.storage.folderRoutes import folderBlueprint
app.register_blueprint(folderBlueprint)

# Register monitoring routes
from api.monitoring import monitoringBlueprint
app.register_blueprint(monitoringBlueprint)


# Note this does not run if using 'flask run'
if __name__ == "__main__":
    app.run(debug=True)
