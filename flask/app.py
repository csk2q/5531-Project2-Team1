import os

from api.monitoring import monitoringBlueprint
from api.storage.fileRoutes import fileBlueprint
from api.storage.folderRoutes import folderBlueprint
from db import db
from flask_cors import CORS
from models import File, User
from werkzeug.utils import secure_filename

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

db.init_app(app)


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


@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"message": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    filename = secure_filename(file.filename)
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    file.save(path)

    new_file = File(
        filename=filename,
        path=path,
        size=os.path.getsize(path),
    )

    db.session.add(new_file)
    db.session.commit()

    return jsonify({"message": f"Uploaded {filename}"}), 200


@app.route("/files", methods=["GET"])
def list_files():
    files = File.query.all()

    return jsonify([{"id": f.id, "name": f.filename, "size": f.size} for f in files])


@app.route("/delete/<int:file_id>", methods=["DELETE"])
def delete_file(file_id):
    file = File.query.get(file_id)

    if not file:
        return jsonify({"message": "File not found"}), 404

    if os.path.exists(file.path):
        os.remove(file.path)

    db.session.delete(file)
    db.session.commit()

    return jsonify({"message": "Deleted successfully"})


@app.route("/download/<int:file_id>", methods=["GET"])
def download_file(file_id):
    file = File.query.get(file_id)

    if not file:
        return jsonify({"message": "File not found"}), 404

    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        os.path.basename(file.path),
        as_attachment=True,
    )


# Register routes from blueprints #

# Register file routes

app.register_blueprint(fileBlueprint)

# Register folder routes

app.register_blueprint(folderBlueprint)

# Register monitoring routes

app.register_blueprint(monitoringBlueprint)


# Note this does not run if using 'flask run'
if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    app.run(debug=True)
