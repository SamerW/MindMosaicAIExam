import logging
from logging.config import dictConfig


def configure_logging(level: str = None):
    # dictConfig({
    #     'version': 1,
    #     'formatters': {'default': {
    #         'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    #     }},
    #     'handlers': {'wsgi': {
    #         'class': 'logging.StreamHandler',
    #         'stream': 'ext://flask.logging.wsgi_errors_stream',
    #         'formatter': 'default'
    #     }, 'console': {
    #         'class': 'logging.StreamHandler',
    #         'formatter': 'default'
    #     }},
    #     'root': {
    #         'level': 'DEBUG',
    #         'handlers': ['console']
    #     }
    # })
    log_formatter = logging.Formatter("%(asctime)s - %(name)-s - [%(levelname)-5.5s]  %(message)s")
    root_logger = logging.getLogger()
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    root_logger.addHandler(console_handler)

    log_level = logging.INFO
    if level:
        level = level.upper()
        if level == 'DEBUG':
            log_level = logging.DEBUG
        elif level == 'WARNING':
            log_level = logging.WARNING
        elif level == 'FATAL':
            log_level = logging.FATAL
    root_logger.setLevel(log_level)
