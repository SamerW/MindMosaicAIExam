import flask
from bson import ObjectId
from werkzeug.datastructures import Headers
from werkzeug.exceptions import NotFound

from mongoDAO import socratRepository, examRepository
from mongoDAO.MongoDAO import MongoDAO
from mongoDAO.reportArchiveRepository import find_report_archive_or_insert, find_report_file, \
    find_report_archive_by_id, find_old_report, delete_full_report_archive
from services.reportArchive.ExamReportCreationThread import ExamReportCreationThread


def start_or_get_exam_reporting(exam_id: str):
    # find exam with minimal properties
    mongo_dao = MongoDAO()
    exam = examRepository.find_exam_by_id(mongo_dao, exam_id, projection={
        '_id': 1,
        'name': 1,
        'duration_minutes': 1,
        'questions': 1,
        'students': 1
    })
    if exam is None:
        raise NotFound('Exam not found')
    # find or create a report
    report, inserted = find_report_archive_or_insert(mongo_dao, exam_id)
    # if inserted create and launch a processing thread
    if inserted:
        th = ExamReportCreationThread(mongo_dao, 'exam', exam, report['_id'])
        th.start()
    # in any case return the report id
    return str(report['_id'])


def start_or_get_socrat_reporting(socrat_id: str):
    # find exam with minimal properties
    mongo_dao = MongoDAO()
    socrat = socratRepository.find_socrat_by_id(mongo_dao, socrat_id, projection={
        '_id': 1,
        'name': 1,
        'questions': 1,
        'students': 1
    })
    if socrat is None:
        raise NotFound('Exam not found')
    # find or create a report
    report, inserted = find_report_archive_or_insert(mongo_dao, socrat_id)
    # if inserted create and launch a processing thread
    if inserted:
        th = ExamReportCreationThread(mongo_dao, 'socrat', socrat, report['_id'])
        th.start()
    # in any case return the report id
    return str(report['_id'])


def get_report_state(report_id: str):
    mongo_dao = MongoDAO()
    report = find_report_archive_by_id(mongo_dao, ObjectId(report_id))
    if report is None:
        raise NotFound('Report not found')
    return {
        'id': str(report['_id']),
        'exam_id': report['exam_id'],
        'state': report['state'],
        'progression': report['progression'],
        'creation_date': report['creation_date'],
        'ready_date': report.get('ready_date', None),
    }


def get_report_file(report_id: str):
    mongo_dao = MongoDAO()
    report = find_report_archive_by_id(mongo_dao, ObjectId(report_id), projection={
        'state': 1,
        'archive_id': 1
    })
    if report is None:
        raise NotFound('Report not found')
    if report['state'] != 'ready' or report['archive_id'] is None:
        raise NotFound('Report not ready')
    filename, data = find_report_file(mongo_dao, report['archive_id'])
    if data is None:
        raise NotFound('Data not found')
    # forge answer
    headers = Headers()
    headers.add('Content-Type', 'application/x-zip-compressed')
    headers.add('Content-Disposition', 'attachment', filename=filename)
    return flask.Response(response=data, headers=headers)


def clean_ready_reports() -> int:
    # for each report ready whose ready date older than 1 hour, remove file and report
    deleted_reports = 0
    mongo_dao = MongoDAO()
    for report in find_old_report(mongo_dao):
        delete_full_report_archive(mongo_dao, report_id=report['_id'])
        deleted_reports += 1
    return deleted_reports
