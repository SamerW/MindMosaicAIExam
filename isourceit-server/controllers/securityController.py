from flask import request, make_response, Blueprint

from services import securityService
from sessions.securedEndpoint import secured_endpoint

__all__ = ['security_controller']

security_controller = Blueprint('security', __name__)


@security_controller.route("/api/rest/admin/login", methods=['POST'])
def authenticate_user():
    data = request.get_json(force=False)
    username = data.get('username', None)
    password = data.get('password', None)
    securityService.authenticate_user(username, password)
    return securityService.get_user_context()


@security_controller.route("/api/rest/composition/access", methods=['POST'])
def grant_student_exam_access():
    data = request.get_json(force=False)
    exam_id = data.get('exam_id', None)
    username = data.get('username', None)
    exam_type = data.get('exam_type', None)
    return securityService.initiate_student_composition_access(exam_id, username, exam_type)


@security_controller.route("/api/rest/composition/ticket-login", methods=['POST'])
def authenticate_student_for_exam():
    data = request.get_json(force=False)
    ticket = data.get('ticket', None)
    securityService.authenticate_student_from_ticket(ticket)
    return securityService.get_user_context()


@security_controller.route("/api/rest/user-context", methods=['GET'])
@secured_endpoint()
def get_user_context():
    return securityService.get_user_context()


@security_controller.route("/api/rest/logout", methods=['POST'])
@secured_endpoint()
def logout():
    securityService.logout()
    resp = make_response('', 204)
    return resp
