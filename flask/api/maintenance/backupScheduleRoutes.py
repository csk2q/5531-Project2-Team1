import os
import zoneinfo
from datetime import datetime, timezone
from logging import getLogger
from typing import Optional

from api.maintenance._backup import backupFull
from api.monitoring import monitoringBlueprint
from api.storage.fileRoutes import fileBlueprint
from api.storage.folderRoutes import folderBlueprint
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from db import db
from flask_cors import CORS
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import Schema, ValidationError, fields
from models import BackupSchedule, User
from werkzeug.utils import secure_filename

from flask import (
    Blueprint,
    Flask,
    abort,
    current_app,
    flash,
    jsonify,
    redirect,
    request,
    url_for,
)

### Variables ###

logger = getLogger(__name__)

backupScheduleRoutes = Blueprint("backupScheduleRoutes", __name__)
scheduler: BackgroundScheduler


class ScheduleSchema(Schema):
    schedule_name = fields.Str(required=True)
    weeks = fields.Int(required=True)
    days = fields.Int(required=True)
    hours = fields.Int(required=True)
    minutes = fields.Int(required=True)
    seconds = fields.Int(required=True)
    start_date = fields.DateTime(required=True)  # parses ISO-8601 by default


scheduleSchema = ScheduleSchema()

### Functions ##


def initScheduler(app: Flask):
    global scheduler
    with app.app_context():
        scheduler = BackgroundScheduler(
            jobstores={"default": SQLAlchemyJobStore(db.engine.url)}, app=app
        )
    scheduler.start()


def run_backup():
    with current_app.app_context():
        backupFull()


def add_schedule(
    id: str, weeks: int, days: int, hours: int, seconds: int, start_date: datetime
):
    trigger = IntervalTrigger(
        weeks=weeks,
        days=days,
        hours=hours,
        seconds=seconds,
        start_date=start_date,
        timezone=datetime.now(timezone.utc).astimezone().tzinfo,
    )
    #   timezone=datetime.now(zoneinfo.ZoneInfo("America/Chicago")))
    job = scheduler.add_job(run_backup, id=id, trigger=trigger, replace_existing=True)


### Routes ###


@backupScheduleRoutes.route("/api/maintenance/backup/schedule/list", methods=["GET"])
@jwt_required()
def list_schedules():
    # Admin-only: backups are system-wide
    current_username = get_jwt_identity()
    current_user = User.query.filter_by(username=current_username).first()
    if not current_user or not getattr(current_user, "is_admin", False):
        return jsonify({"message": "Admin privileges required"}), 403
    schedules = BackupSchedule.query.all()
    result = []
    for s in schedules:
        result.append(
            {
                "id": s.id,
                "name": s.name,
                "start_date": s.start_date.isoformat() if s.start_date else None,
                "weeks": s.weeks,
                "days": s.days,
                "hours": s.hours,
                "seconds": s.seconds,
            }
        )
    return jsonify({"schedules": result})


@backupScheduleRoutes.route("/api/maintenance/backup/schedule/create", methods=["POST"])
@jwt_required()
def create_schedule():
    # Admin-only: backups are system-wide
    current_username = get_jwt_identity()
    current_user = User.query.filter_by(username=current_username).first()
    if not current_user or not getattr(current_user, "is_admin", False):
        return jsonify({"message": "Admin privileges required"}), 403
    json_data = request.get_json()
    try:
        data: dict = scheduleSchema.load(json_data)  # type: ignore
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    schedule = BackupSchedule(
        name=data["schedule_name"],
        weeks=data["weeks"],
        days=data["days"],
        hours=data["hours"],
        seconds=data["seconds"],
        start_date=data["start_date"],
    )

    db.session.add(schedule)
    db.session.commit()

    try:
        add_schedule(
            id=str(schedule.id),
            weeks=data["weeks"],
            days=data["days"],
            hours=data["hours"],
            seconds=data["seconds"],
            start_date=data["start_date"],
        )
    except Exception as error:
        # Cleanup schedule without a job
        db.session.delete(schedule)
        db.session.commit()
        logger.error("Failed to create the schedule!", error)
        return jsonify(
            {"message": "Failed to create the schedule!", "error": str(error)}
        ), 400
    return jsonify({"message": "Schedule created!"})


@backupScheduleRoutes.route(
    "/api/maintenance/backup/schedule/modify/<int:scheduleId>", methods=["POST"]
)
def modify_schedule(scheduleId):
    json_data = request.get_json()
    try:
        data: dict = scheduleSchema.load(json_data)  # type: ignore
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    schedule: Optional[BackupSchedule] = BackupSchedule.query.get(scheduleId)

    if schedule is None:
        return jsonify({"message": "Failed to find the that schedule schedule!"}), 500

    schedule.name = (data["schedule_name"],)
    schedule.weeks = (data["weeks"],)
    schedule.days = (data["days"],)
    schedule.hours = (data["hours"],)
    schedule.seconds = (data["seconds"],)
    schedule.start_date = data["start_date"]

    try:
        add_schedule(
            id=str(schedule.id),
            weeks=data["weeks"],
            days=data["days"],
            hours=data["hours"],
            seconds=data["seconds"],
            start_date=data["start_date"],
        )
        db.session.commit()
    except Exception as error:
        logger.error("Failed to update the schedule!", error)
        return jsonify(
            {"message": "Failed to create the schedule!", "error": str(error)}
        ), 400
    return jsonify({"message": "Schedule modified!"})


@backupScheduleRoutes.route(
    "/api/maintenance/backup/schedule/remove/<int:scheduleId>", methods=["POST"]
)
def remove_schedule(scheduleId):
    json_data = request.get_json()
    try:
        data: dict = scheduleSchema.load(json_data)  # type: ignore
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    schedule: Optional[BackupSchedule] = BackupSchedule.query.get(scheduleId)

    if schedule is None:
        return jsonify({"message": "Failed to find the that schedule schedule!"}), 500

    try:
        scheduler.remove_job(str(schedule.id))
    except Exception as error:
        logger.error("Failed to delete the schedule!", error)
        return jsonify(
            {"message": "Failed to delete the schedule!", "error": str(error)}
        ), 500

    return jsonify({"message": "Schedule deleted!"})
