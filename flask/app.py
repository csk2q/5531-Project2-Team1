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


# -------- FILE STORAGE -------- #


# Register file routes
from api.storage.file.about import fileAboutRoute
app.register_blueprint(fileAboutRoute)
from api.storage.file.delete import fileDeleteRoute
app.register_blueprint(fileDeleteRoute)
from api.storage.file.download import fileDownloadRoute
app.register_blueprint(fileDownloadRoute)
from api.storage.file.rename import fileRenameRoute
app.register_blueprint(fileRenameRoute)
from api.storage.file.upload import fileUploadRoute
app.register_blueprint(fileUploadRoute)

# Register folder routes
from api.storage.folder.list import folderListRoute
app.register_blueprint(folderListRoute)
from api.storage.folder.listHomeFolder import folderListHomeRoute
app.register_blueprint(folderListHomeRoute)

# Register monitoring routes
from api.monitoring.cpu import routeCPU
app.register_blueprint(routeCPU)
from api.monitoring.memory import routeMemory
app.register_blueprint(routeMemory)
from api.monitoring.storage import routeStorage
app.register_blueprint(routeStorage)



# ---------------- RUN APP ---------------- #

# Note this does not run if using 'flask run'
if __name__ == "__main__":
    app.run(debug=True)
