import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

# ---------------- CONFIG ---------------- #
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

db = SQLAlchemy(app)
with app.app_context():
    db.create_all()  # creates app.db + tables

# ---------------- MODELS ---------------- #

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class File(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    path = db.Column(db.Text, nullable=False)
    size = db.Column(db.Integer)
    uploaded_at = db.Column(db.DateTime, default=db.func.now())


# ---------------- ROUTES ---------------- #

@app.route("/")
def home():
    return "Backend is running!"


# -------- AUTH -------- #

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
