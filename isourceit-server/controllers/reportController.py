from flask import redirect, url_for, Blueprint

from services import examReportService
from sessions.securedEndpoint import secured_endpoint
from sessions.sessionManagement import TEACHER_ROLE, ADMIN_ROLE
import logging
__all__ = ['report_controller']

report_controller = Blueprint('report', __name__)
LOG = logging.getLogger(__name__)

@report_controller.route("/api/rest/admin/exams/<exam_id>/reports", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_exam_report(exam_id: str):
    report_id = examReportService.start_or_get_exam_reporting(exam_id)
    return redirect(url_for("report.get_report_info", _external=True, report_id=report_id), 302)


@report_controller.route("/api/rest/admin/socrats/<socrat_id>/reports", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_socrat_report(socrat_id: str):
    report_id = examReportService.start_or_get_socrat_reporting(socrat_id)
    return redirect(url_for("report.get_report_info", _external=True, report_id=report_id), 302)


@report_controller.route("/api/rest/admin/reports/<report_id>", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_report_info(report_id: str):
    info = examReportService.get_report_state(report_id)
    if info['state'] == 'ready':
        info['archive_url'] = url_for("report.get_report_archive", _external=True, report_id=report_id)
    return info


@report_controller.route("/api/rest/admin/reports/<report_id>/archive", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_report_archive(report_id: str):
    return examReportService.get_report_file(report_id)


@report_controller.route("/api/rest/admin/reports", methods=['DELETE'])
@secured_endpoint(ADMIN_ROLE)
def delete_ready_reports():
    deleted_reports = examReportService.clean_ready_reports()
    return dict(deleted_reports=deleted_reports)
