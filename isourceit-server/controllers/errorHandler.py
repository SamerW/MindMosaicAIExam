from typing import TypedDict, Optional
import pydantic
import werkzeug
from bson.errors import InvalidId
from flask import Blueprint
from pymongo.errors import DuplicateKeyError
from werkzeug.exceptions import InternalServerError, HTTPException, NotFound
from flask import current_app

__all__ = ['error_handler']

error_handler = Blueprint('error', __name__)


class ErrorMessage(TypedDict):
    error: str
    details: Optional[str]
    code: int
    type: Optional[str]


@error_handler.errorhandler(pydantic.ValidationError)
@error_handler.errorhandler(werkzeug.exceptions.BadRequest)
@error_handler.errorhandler(InvalidId)
def handle_bad_request(e):
    return ErrorMessage(error='bad request', details=str(e), code=400), 400


@error_handler.errorhandler(NotFound)
def handle_not_found(e):
    return ErrorMessage(error='resource not found', details=str(e), code=404), 404


@error_handler.errorhandler(DuplicateKeyError)
def handle_duplicate_key(e):
    return ErrorMessage(error='duplicate exception', details=str(e), code=409), 409


@error_handler.errorhandler(HTTPException)
def handle_other_http_exception(e: HTTPException):
    return ErrorMessage(error=e.description, details=str(e), code=e.code), e.code


@error_handler.errorhandler(Exception)
def handle_other_exception(e: Exception):
    current_app.logger.warning("Unmanaged error: %s.", str(e))
    return ErrorMessage(error="Unmanaged error", details=str(e), type=type(e).__name__, code=500), 500
