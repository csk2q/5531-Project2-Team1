import zoneinfo
from datetime import datetime, timezone
import os

from flask import Flask, request, jsonify
from marshmallow import Schema, fields, ValidationError

from api.monitoring import monitoringBlueprint
from api.storage.fileRoutes import fileBlueprint
from api.storage.folderRoutes import folderBlueprint
from db import db
from models import BackupSchedule
from flask_cors import CORS
from werkzeug.utils import secure_filename

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.triggers.interval import IntervalTrigger

from flask import Blueprint, Flask, request, jsonify, redirect, url_for, flash, current_app, abort

from api.maintenance._backup import backupFull

from logging import getLogger

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
        scheduler = BackgroundScheduler(jobstores={
        'default': SQLAlchemyJobStore(db.engine.url)
        }, app=app)
    scheduler.start()

def run_backup():
    with current_app.app_context():
        backupFull()

def add_schedule(id: str, weeks: int, days: int, hours: int, seconds: int, start_date: datetime):
    trigger = IntervalTrigger(weeks=weeks, days=days, hours=hours, seconds=seconds, start_date=start_date,
                              timezone=datetime.now(timezone.utc).astimezone().tzinfo)
                            #   timezone=datetime.now(zoneinfo.ZoneInfo("America/Chicago")))
    job = scheduler.add_job(run_backup, id=id, trigger=trigger, replace_existing=True)


### Routes ###

@backupScheduleRoutes.route("/api/maintenance/backup/schedule/list", methods=["GET"])
def list_schedules():
    allSchedules = BackupSchedule.query.all()
    return jsonify(allSchedules)

@backupScheduleRoutes.route("/api/maintenance/backup/schedule/create", methods=["POST"])
def create_schedule():    
    json_data = request.get_json()
    try:
        data: dict = scheduleSchema.load(json_data) # type: ignore
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    schedule = BackupSchedule(
        name=data["schedule_name"],
        weeks=data["weeks"],
        days=data["days"],
        hours=data["hours"],
        seconds=data["seconds"],
        start_date=data["start_date"]
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
        logger.error('Failed to create the schedule!', error)
        return jsonify({'message': 'Failed to create the schedule!', 'error': str(error)}), 400
    return jsonify({'message': 'Schedule created!'})

@backupScheduleRoutes.route("/api/maintenance/backup/schedule/modify/<int:scheduleId>", methods=["POST"])
def modify_schedule():
    # TODO: Implement this route
    return jsonify({'message': 'tbi'})

@backupScheduleRoutes.route("/api/maintenance/backup/schedule/remove/<int:scheduleId>", methods=["POST"])
def remove_schedule():
    # TODO: Implement this route
    return jsonify({'message': 'tbi'})

