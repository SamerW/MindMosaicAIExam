from flask import request, Blueprint

from services import studentActionService
from sessions.securedEndpoint import secured_endpoint
from sessions.sessionManagement import STUDENT_ROLE, TEACHER_ROLE, ADMIN_ROLE
import logging
from mongoDAO.MongoDAO import MongoDAO
from mongoDAO.studentActionRepository import update_comment_on_answer
__all__ = ['student_action_controller']

student_action_controller = Blueprint('student_action', __name__)


LOG = logging.getLogger(__name__)




@student_action_controller.route("/api/rest/composition/actions", methods=['POST'])
@secured_endpoint(STUDENT_ROLE)
def send_action():
    data = request.get_json(force=False)
    LOG.info(data)
    return studentActionService.handle_action(data)

@student_action_controller.route("/api/rest/composition/sendMessage", methods=['POST'])
@secured_endpoint(STUDENT_ROLE)
def send_message():
    data = request.get_json(force=False)
    if "prompt-" in data['questionId']:
        question_id = data['questionId'].replace("prompt-","")
    elif "ans-" in data['questionId']:
        question_id = data['questionId'].replace("ans-","")
    else:
        return 'not sent', 200
    studentActionService.handle_comment_answer(question_id, data['comment'])
    return '', 204

@student_action_controller.route("/api/rest/composition/sendSearchQuery", methods=['POST'])
@secured_endpoint(STUDENT_ROLE)
def send_search_query():
    data = request.get_json(force=False)
    LOG.info("data search engine ")
    LOG.info(data)
    res = studentActionService.handle_action(data)
    return res

@student_action_controller.route("/api/rest/composition/visitUrl", methods=['POST'])
@secured_endpoint(STUDENT_ROLE)
def visit_url():
    data = request.get_json(force=False)
    res = studentActionService.handle_action(data)
    return res

@student_action_controller.route("/api/rest/composition/actions/external-resources/<action_id>", methods=['DELETE'])
@secured_endpoint(STUDENT_ROLE)
def delete_resource(action_id: str):
    studentActionService.mark_external_resource_removed(action_id)
    return '', 204


@student_action_controller.route("/api/rest/admin/exams/<exam_id>/students/<student_username>/actions", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_admin_exam_student_actions(exam_id: str, student_username: str):
    return studentActionService.get_exam_student_actions(exam_id, student_username)


@student_action_controller.route("/api/rest/admin/socrats/<exam_id>/students/<student_username>/actions",
                                 methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_admin_socrat_student_actions(exam_id: str, student_username: str):
    return studentActionService.get_socrat_student_actions(exam_id, student_username)
