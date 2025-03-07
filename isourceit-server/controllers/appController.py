from flask import Blueprint, current_app

from services.ChatAIManager import ChatAIManager

from sessions.securedEndpoint import secured_endpoint
from sessions.sessionManagement import TEACHER_ROLE, ADMIN_ROLE
import logging
__all__ = ['app_controller']

app_controller = Blueprint('app', __name__)

LOG = logging.getLogger(__name__)

@app_controller.route("/api/rest/admin/app-settings/chats-available", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_chat_available():
    # load chat manager and return available chats
    chat_ai_mgr = ChatAIManager()
    LOG.info(" --- -- -- - - - info")
    LOG.info(chat_ai_mgr.available_chats)
    return chat_ai_mgr.available_chats

@app_controller.route("/api/rest/admin/app-settings/search-available", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_search_available():
    # load chat manager and return available chats
    res = [
            {
                "engine_key": "Google",
                "copyPaste": False,
                "id": "Google_engine",
                "search_engine_key": "mistral:latest22",
                "privateKeyRequired": True,
                "title": "Google"
            },
            {
                "engine_key": "Bing",
                "copyPaste": False,
                "id": "Bing_engine",
                "search_engine_key": "mistral:latest22",
                "privateKeyRequired": True,
                "title": "Bing"
            },
            {
                "engine_key": "Brave",
                "copyPaste": False,
                "id": "Brave_engine",
                "search_engine_key": "mistral:latest22",
                "privateKeyRequired": True,
                "title": "Brave"
            },
            ]
    return res


@app_controller.route("/api/rest/admin/app-settings/default-socrat-init-prompt", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_default_socrat_init_prompt():
    return current_app.config.get('DEFAULT_SOCRAT_INIT_PROMPT')
