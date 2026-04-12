from db import db
from werkzeug.security import check_password_hash, generate_password_hash


# -------- USER --------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True)

    password_hash = db.Column(db.Text, nullable=False)

    storage_allocation = db.Column(db.BigInteger, default=1073741824)
    max_file_size = db.Column(db.BigInteger, default=104857600)

    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.now())

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


# -------- FOLDER --------
class Folder(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(255), nullable=False)

    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("folder.id"))

    created_at = db.Column(db.DateTime, default=db.func.now())


# -------- FILE --------
class File(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    filename = db.Column(db.String(255), nullable=False)
    path = db.Column(db.Text, nullable=False)

    size = db.Column(db.Integer)
    hash = db.Column(db.String(255))

    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    folder_id = db.Column(db.Integer, db.ForeignKey("folder.id"))

    uploaded_at = db.Column(db.DateTime, default=db.func.now())
    deleted = db.Column(db.Boolean, default=False)


# -------- PERMISSION --------
class Permission(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    file_id = db.Column(db.Integer, db.ForeignKey("file.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    permission_type = db.Column(db.String(10))  # read / write / admin


# -------- LOG --------
class Log(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    timestamp = db.Column(db.DateTime, default=db.func.now())

    category = db.Column(db.String(50))
    level = db.Column(db.String(20))

    message = db.Column(db.Text)


# -------- SYSTEM METRIC --------
class SystemMetric(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    timestamp = db.Column(db.DateTime, default=db.func.now())

    metric_type = db.Column(db.String(20))
    value = db.Column(db.Float)


# -------- BACKUP SCHEDULE --------
class BackupSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100))
    frequency = db.Column(db.String(50))
    offset = db.Column(db.Integer)


# -------- BACKUP --------
class Backup(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    schedule_id = db.Column(db.Integer, db.ForeignKey("backup_schedule.id"))

    trigger_type = db.Column(db.String(20))
    scope = db.Column(db.String(20))

    created_at = db.Column(db.DateTime, default=db.func.now())

    name = db.Column(db.String(255))
    comment = db.Column(db.Text)

    file_path = db.Column(db.Text)
    hash = db.Column(db.String(255))
    size = db.Column(db.Integer)
