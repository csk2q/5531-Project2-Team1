import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask import send_from_directory

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# ------------ MODELS ------------ #

# ---------------- MODELS ----------------

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class File(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    path = db.Column(db.Text, nullable=False)
    size = db.Column(db.Integer)
    uploaded_at = db.Column(db.DateTime, default=db.func.now())



# ------------ ROUTES ------------ #

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"message": "User exists"}), 400

    user = User(username=data["username"])
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created"})

@app.route("/files", methods=["GET"])
def list_files():
    files = File.query.all()

    return jsonify([
        {
            "id": f.id,
            "name": f.filename,
            "size": f.size
        }
        for f in files
    ])

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

@app.route("/download/<filename>", methods=["GET"])
def download_file(filename):
    try:
        # as_attachment=True forces the browser to download it instead of opening it
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"message": "File not found"}), 404

@app.route("/")
def home():
    return "Backend is running!"

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if username == "admin" and password == "123":
        return jsonify({"message": "Login successful", "role": "admin"})
    else:
        return jsonify({"message": "Invalid credentials"}), 401




if __name__ == "__main__":
    with app.app_context():
            db.create_all()  # creates app.db and tables
    app.run(debug=True)
