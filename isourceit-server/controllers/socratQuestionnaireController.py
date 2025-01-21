from flask import request, Blueprint

from services import socratQuestionnaireService, securityService
from sessions.securedEndpoint import secured_endpoint
from sessions.sessionManagement import TEACHER_ROLE, ADMIN_ROLE, STUDENT_ROLE

__all__ = ['socrat_controller']

socrat_controller = Blueprint('socrat', __name__)


@socrat_controller.route("/api/rest/admin/socrats", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_socrats_summary():
    return socratQuestionnaireService.find_admin_socrats_summary()


@socrat_controller.route("/api/rest/admin/socrats/<socrat_id>", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_socrat(socrat_id: str):
    raw_w_action_summary = request.args.get('with_action_summary', 'False')
    with_action_summary = raw_w_action_summary.lower() in ['1', 'yes', 'y', 'true']
    return socratQuestionnaireService.find_admin_socrat_by_id(socrat_id, with_action_summary=with_action_summary)


@socrat_controller.route("/api/rest/admin/socrats", methods=['POST'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def create_socrat():
    data = request.get_json(force=False)
    return socratQuestionnaireService.create_socrat(data)


@socrat_controller.route("/api/rest/admin/socrats/<socrat_id>", methods=['PUT'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def update_socrat(socrat_id: str):
    data = request.get_json(force=False)
    return socratQuestionnaireService.update_socrat(socrat_id, data)


@socrat_controller.route("/api/rest/admin/socrats/<socrat_id>/student-authentications", methods=['PUT'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def generate_students_auth_urls(socrat_id: str):
    return securityService.initiate_all_student_composition_access(socrat_id, 'socrat')


@socrat_controller.route("/api/rest/composition/socrats/<socrat_id>", methods=['GET'])
@secured_endpoint(STUDENT_ROLE)
def get_composition_socrat(socrat_id: str):
    return socratQuestionnaireService.find_composition_socrat_by_id(socrat_id)
