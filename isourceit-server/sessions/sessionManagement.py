import logging
from datetime import datetime
from typing import Optional

from flask import session

__all__ = ['STUDENT_ROLE', 'TEACHER_ROLE', 'ADMIN_ROLE',
           'clear_session', 'has_logged_session', 'build_user_context_from_session',
           'session_is_student', 'session_is_teacher_or_admin', 'session_exam_type', 'session_username',
           'update_session_student_info', 'session_exam_id', 'is_exam_started', 'is_exam_ended',
           'init_exam_composition_session', 'init_socrat_composition_session', 'init_admin_session',
           'get_ws_sid', 'update_session_ws_sid']

LOG = logging.getLogger(__name__)

STUDENT_ROLE = 'student'
TEACHER_ROLE = 'teacher'
ADMIN_ROLE = 'admin'

SESSION_TYPE_ADMIN = 'admin'
SESSION_TYPE_COMPOSITION = 'composition'


def init_admin_session(username: str, role: str):
    if 'username' in session:
        raise Exception('Cannot init an already init session')
    if not username or not role or role not in [TEACHER_ROLE, ADMIN_ROLE]:
        raise Exception('Cannot init a session without a proper username or role')

    session['username'] = username
    session['role'] = role
    session['session_type'] = SESSION_TYPE_ADMIN


def init_exam_composition_session(username: str, role: str, exam_id: str, exam_started: bool,
                                  exam_ended: bool, timeout: datetime = None):
    if 'username' in session:
        raise Exception('Cannot init an already init session')
    if not username or role != STUDENT_ROLE:
        raise Exception('Cannot init a session without a proper username or role')

    session['username'] = username
    session['role'] = role
    session['session_type'] = SESSION_TYPE_COMPOSITION
    session['exam_type'] = 'exam'
    session['exam_id'] = exam_id
    session['exam_started'] = exam_started
    session['exam_ended'] = exam_ended
    session['timeout'] = timeout


def init_socrat_composition_session(username: str, role: str, socrat_id: str, socrat_started: bool,
                                    socrat_ended: bool):
    if 'username' in session:
        raise Exception('Cannot init an already init session')
    if not username or role != STUDENT_ROLE:
        raise Exception('Cannot init a session without a proper username or role')

    session['username'] = username
    session['role'] = role
    session['session_type'] = SESSION_TYPE_COMPOSITION
    session['exam_type'] = 'socrat'
    session['exam_id'] = socrat_id
    session['exam_started'] = socrat_started
    session['exam_ended'] = socrat_ended


def clear_session():
    session.clear()


def has_logged_session() -> bool:
    return 'username' in session


def session_is_student() -> bool:
    return session.get('role', None) == STUDENT_ROLE


def session_is_teacher_or_admin() -> bool:
    return session.get('role', None) in (TEACHER_ROLE, ADMIN_ROLE)


def session_username() -> Optional[str]:
    return session.get('username')


def session_type() -> str:
    return session.get('session_type')


def session_exam_type() -> str:
    return session.get('exam_type')


def session_exam_id() -> str:
    return session.get('exam_id')


def is_exam_started() -> bool:
    if session_type() != SESSION_TYPE_COMPOSITION:
        Exception('Session does not have composition context')
    return session.get('exam_started')


def is_exam_ended() -> bool:
    if session_type() != SESSION_TYPE_COMPOSITION:
        Exception('Session does not have composition context')
    exam_ended = session.get('exam_ended')
    timeout = session.get('timeout')
    if exam_ended is True:
        return True
    if timeout is not None:
        return timeout < datetime.utcnow()
    return False


def update_session_student_info(exam_id: str = None, exam_started: bool = None, exam_ended: bool = None,
                                timeout: datetime = None):
    if session_type() != SESSION_TYPE_COMPOSITION:
        Exception('Session does not have composition context')
    if exam_id is not None:
        session['exam_id'] = exam_id
    if exam_started is not None:
        session['exam_started'] = exam_started
    if exam_ended is not None:
        session['exam_ended'] = exam_ended
    if timeout is not None:
        session['timeout'] = timeout


def get_ws_sid():
    return session.get('ws_sid')


def update_session_ws_sid(sid: str):
    old_ws_sid = session.get('ws_sid')
    if old_ws_sid is None or old_ws_sid != sid:
        session['ws_sid'] = sid


def build_user_context_from_session():
    if 'username' not in session:
        return None
    context = {
        'user': {
            'username': session['username'],
        },
        'role': session['role']
    }
    for attr in ['exam_type', 'exam_id', 'exam_started', 'exam_ended', 'timeout']:
        if attr in session:
            context[attr] = session[attr]

    return context
