import os
from flask import Flask, request, jsonify, redirect, url_for, flash
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import send_from_directory




app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


# Register file routes
from api.storage.file.upload import fileUploadRoute
app.register_blueprint(fileUploadRoute)
from api.storage.file.download import fileDownloadRoute
app.register_blueprint(fileDownloadRoute)
from api.storage.file.delete import fileDeleteRoute
app.register_blueprint(fileDeleteRoute)
from api.storage.file.about import fileAboutRoute
app.register_blueprint(fileAboutRoute)

# Register folder routes
from api.storage.folder.list import folderListRoute
app.register_blueprint(folderListRoute)





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