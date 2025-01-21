from functools import wraps
from flask import session
from werkzeug.exceptions import Unauthorized
from sessions.sessionManagement import has_logged_session

__all__ = ['secured_endpoint', 'secure_endpoint']


def secured_endpoint(*roles):
    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not has_logged_session():
                raise Unauthorized("Authentication required")
            if roles and session.get('role') not in roles:
                raise Unauthorized("Unhauthorized role")
            result = func(*args, **kwargs)
            return result
        return wrapper
    return decorate


def secure_endpoint(*roles):
    if not has_logged_session():
        raise Unauthorized("Authentication required")
    if roles and session.get('role') not in roles:
        raise Unauthorized("Unhauthorized role")