import os
from flask import Flask, request, jsonify
from flask_cors import CORS


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


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