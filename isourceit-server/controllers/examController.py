from flask import request, Blueprint
from services import examService, securityService
from sessions.securedEndpoint import secured_endpoint
from sessions.sessionManagement import TEACHER_ROLE, ADMIN_ROLE, STUDENT_ROLE
import logging
from services.chatAI.OllamaHandler2 import OllamaHandler2

__all__ = ['exam_controller']

exam_controller = Blueprint('exam', __name__)
LOG = logging.getLogger(__name__)

@exam_controller.route("/api/rest/admin/exams", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_exams_summary():
    return examService.find_admin_exams_summary()


@exam_controller.route("/api/rest/admin/exams/<exam_id>", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_exam(exam_id: str):
    raw_w_action_summary = request.args.get('with_action_summary', 'False')
    with_action_summary = raw_w_action_summary.lower() in ['1', 'yes', 'y', 'true']
    LOG.info("  with_action_summary ---")
    LOG.info(raw_w_action_summary)
    return examService.find_admin_exam_by_id(exam_id, with_action_summary=with_action_summary)


@exam_controller.route("/api/rest/admin/exams", methods=['POST'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def create_exam():
    data = request.get_json(force=False)
    LOG.info("  ccccreate exam")
    LOG.info(data)
    return examService.create_exam(data)


@exam_controller.route("/api/rest/admin/exams/<exam_id>", methods=['PUT'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def update_exam(exam_id: str):
    data = request.get_json(force=False)
    return examService.update_exam(exam_id, data)


@exam_controller.route("/api/rest/admin/exams/<exam_id>/student-authentications", methods=['PUT'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def generate_students_auth_urls(exam_id: str):
    return securityService.initiate_all_student_composition_access(exam_id, 'exam')


@exam_controller.route("/api/rest/composition/exams/<exam_id>", methods=['GET'])
@secured_endpoint(STUDENT_ROLE)
def get_composition_exam(exam_id: str):
    return examService.find_composition_exam_by_id(exam_id)


