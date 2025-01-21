from flask import request, abort, Blueprint
from mongoModel.User import User
from services import userService
from sessions.securedEndpoint import secured_endpoint
from sessions.sessionManagement import ADMIN_ROLE

__all__ = ['user_controller']

user_controller = Blueprint('user', __name__)


@user_controller.route("/api/rest/admin/users", methods=['POST'])
@secured_endpoint(ADMIN_ROLE)
def create_user():
    data = request.get_json(force=False)
    return userService.create_user(data)


@user_controller.route("/api/rest/admin/users/by-username/<username>", methods=['GET'])
@secured_endpoint(ADMIN_ROLE)
def get_user_by_username(username: str):
    user: User = userService.find_user_by_username(username)
    if user is None:
        abort(404, 'unknown user')
    return user


@user_controller.route("/api/rest/admin/users/<user_id>", methods=['PUT'])
@secured_endpoint(ADMIN_ROLE)
def update_user(user_id: str):
    data = request.get_json(force=False)
    return userService.update_user(user_id, data)


@user_controller.route("/api/rest/admin/users/<user_id>", methods=['PATCH'])
@secured_endpoint(ADMIN_ROLE)
def patch_user(user_id: str):
    data = request.get_json(force=False)
    return userService.patch_user(user_id, data)


@user_controller.route("/api/rest/admin/users/<user_id>", methods=['DELETE'])
@secured_endpoint(ADMIN_ROLE)
def delete_user(user_id: str):
    userService.delete_user(user_id)
    return '', 204