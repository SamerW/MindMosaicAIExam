from flask import Blueprint, current_app

from services.ChatAIManager import ChatAIManager
from sessions.securedEndpoint import secured_endpoint
from sessions.sessionManagement import TEACHER_ROLE, ADMIN_ROLE

__all__ = ['app_controller']

app_controller = Blueprint('app', __name__)


@app_controller.route("/api/rest/admin/app-settings/chats-available", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_chat_available():
    # load chat manager and return available chats
    chat_ai_mgr = ChatAIManager()
    return chat_ai_mgr.available_chats


@app_controller.route("/api/rest/admin/app-settings/default-socrat-init-prompt", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_default_socrat_init_prompt():
    return current_app.config.get('DEFAULT_SOCRAT_INIT_PROMPT')
