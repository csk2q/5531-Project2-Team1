import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route("/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    # security measure to prevent directory traversal attacks
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    
    return jsonify({"message": f"Successfully uploaded {filename}"}), 200

@app.route("/files", methods=["GET"])
def list_files():
    files = os.listdir(app.config['UPLOAD_FOLDER'])
    return jsonify({"files": files})

@app.route("/delete/<filename>", methods=["DELETE"])
def delete_file(filename):
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": f"{filename} deleted successfully"}), 200
        else:
            return jsonify({"message": "File not found"}), 404
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
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
    app.run(debug=True)