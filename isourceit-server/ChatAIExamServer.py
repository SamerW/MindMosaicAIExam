# Required to have subprocess emitting on server websocket
# Required at the begining, before importing other module, especially mongo
import eventlet

eventlet.monkey_patch()

import logging
from argparse import ArgumentParser
from typing import Tuple
from datetime import timedelta
from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from werkzeug.middleware.proxy_fix import ProxyFix
from utils.loggingUtils import configure_logging
from mongoDAO.MongoDAO import MongoDAO
from sessions.MongoSession import AutoCleanMongoSession
from services.ChatAIManager import ChatAIManager
from sessions.sessionManagement import session_is_student, has_logged_session, update_session_ws_sid
from services.mailService import MailService

from controllers.errorHandler import error_handler
from controllers.securityController import security_controller
from controllers.userController import user_controller
from controllers.studentActionController import student_action_controller
from controllers.appController import app_controller
from controllers.examController import exam_controller
from controllers.reportController import report_controller
from controllers.socratQuestionnaireController import socrat_controller

LOG = logging.getLogger(__name__)


def setup_argument_parser() -> ArgumentParser:
    parser = ArgumentParser(description="I Fix It Server")
    parser.add_argument('-c', '--config', help="Configuration file location (default: ./config.py)",
                        metavar='<configuration file>', type=str, default='./config.py')
    parser.add_argument('-s', '--static-folder', help="Static resource folder path (default: ./static)",
                        metavar='<static folder path>', type=str, default='./static')
    parser.add_argument('-l', '--log-level', help="Level of logger", metavar='<logging level>', type=str,
                        default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'FATAL'])
    return parser


def create_server_apps(config_file_path: str, static_folder_path: str,
                       log_level: str) -> Tuple[Flask, SocketIO, ChatAIManager]:
    # Flask application
    LOG.info("Init flask app with static resource folder {} and configuration file {}..."
             .format(static_folder_path, config_file_path))
    app: Flask = Flask(__name__, static_url_path='/app', static_folder=static_folder_path)
    app.config.from_pyfile(config_file_path)
    app.config['LOG_LEVEL'] = log_level  # Will be used by subprocesses to configure their logging

    # Proxy settings
    app.wsgi_app = ProxyFix(
        app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1
    )

    # CORS setup for Flask and socket.io
    socket_io_allowed_origin = None
    # if app.config.get('ENABLE_CORS', False):
    #     app.logger.warning("ENABLE CORS")
    #     cors = CORS(app, resources={r"/api/*": {
    #         "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "moz-extension://*"],
    #         "supports_credentials": True
    #     }})
    #     socket_io_allowed_origin = ("http://localhost:8888", "http://127.0.0.1:8888")
    #to allow access using IP of the host machine
    if app.config.get('ENABLE_CORS', False):
        app.logger.warning("ENABLE CORS")
        cors = CORS(app, resources={r"/api/*": {
                        "origins": "*",  # Allow all origins
                        "supports_credentials": True
                    }})
        socket_io_allowed_origin = "*"

    # Flask-SocketIO initialisation
    socketio = SocketIO(app, message_queue=app.config.get('REDIS_URL', 'redis://'),
                        cors_allowed_origins=socket_io_allowed_origin, cors_credentials=True, manage_session=False)

    # MONGO Access setup
    app.logger.info("Open MongoDAO")
    mongo_dao = MongoDAO(MongoDAO.compute_dao_options_from_app(app.config))
    mongo_dao.open()
    app.logger.info("Mongo init index")
    mongo_dao.init_indexes()

    # Session setup
    app.logger.info("Setup Mongo-managed HTTP sessions")
    app.session_interface = AutoCleanMongoSession(mongo_dao.session_col, threshold_cleaner=timedelta(hours=2))

    # validate token communication configuration and issue error is misconfig
    if app.config.get('TICKET_COM_SEND_MAIL', False) is False \
            and app.config.get('TICKET_COM_TEACHER', True) is False \
            and app.config.get('TICKET_COM_ANSWER_ON_GENERATE', False) is False:
        for _ in range(5):
            LOG.error("Configuration error detected: no student exam access ticket communication configured!")

    if app.config.get('TICKET_COM_SEND_MAIL', True) is True and app.config.get('MAIL_SERVER', None) is None:
        for _ in range(5):
            LOG.error("Configuration error detected: ticket communication by mail set but no mail server is given!")

    # mail setup if required
    if app.config.get('TICKET_COM_SEND_MAIL', False) is True:
        mail_svc = MailService(app)

    # Setup Chat AI Service
    app.logger.info("Setup chat AI manager")
    chat_ai_mgr = ChatAIManager(app.config)

    # SPA routing
    @app.route('/', defaults={'u_path': ''})
    @app.route('/<path:u_path>')
    def catch_all(u_path):
        return app.send_static_file("index.html")

    # REST Controllers setup
    app.register_blueprint(error_handler)
    app.register_blueprint(security_controller)
    app.register_blueprint(user_controller)
    app.register_blueprint(student_action_controller)
    app.register_blueprint(app_controller)
    app.register_blueprint(exam_controller)
    app.register_blueprint(report_controller)
    app.register_blueprint(socrat_controller)

    # Websocket controllers setup
    @socketio.on('connect')
    def test_connect(auth):
        LOG.info("connection --- socket")
        try:
            if not has_logged_session() or not session_is_student():
                raise ConnectionRefusedError("Authentication with proper role required")
        except ConnectionRefusedError as e:
            LOG.warning("Websocket connection refused {}".format(str(e)))
            return False
        else:
            update_session_ws_sid(request.sid)
            emit('info', {'message': 'Welcome'})

    @socketio.on('disconnect')
    def test_disconnect():
        LOG.info("disconnection --- socket")
        pass

    return app, socketio, chat_ai_mgr


def start_server(app: Flask, socketio: SocketIO, chat_ai_mgr: ChatAIManager):
    app.logger.info("Start AI Manager")
    LOG.info("LOG: Start AI Manager")
    chat_ai_mgr.start()

    host = app.config.get('SERVER_HOST', '127.0.0.1')
    port = app.config.get('SERVER_PORT', 5000)
    debug = app.config.get('DEBUG', False)
    app.logger.info("Start Flask-socketio server on host {} and port {}".format(host, port))
    if debug:
        app.logger.warning('DEBUG mode enabled')
    socketio.run(app, host=host, port=port, debug=debug)


if __name__ == '__main__':
    # Parse application arguments
    arg_parser = setup_argument_parser()
    args = arg_parser.parse_args()

    # Logging configuration
    configure_logging(args.log_level)

    # Create and configure apps
    app, socketio_app, chat_ai_mgr = create_server_apps(args.config, args.static_folder, args.log_level)
    # Start server
    start_server(app, socketio_app, chat_ai_mgr)
