import hashlib
import logging
from datetime import timedelta
from typing import Optional, Dict, List
from uuid import uuid4

from cryptography.fernet import Fernet
from flask import current_app
from itsdangerous import URLSafeSerializer, BadData
from werkzeug.exceptions import Unauthorized, BadRequest

from mongoDAO import userRepository, examRepository, studentActionRepository, socratRepository
from mongoDAO.MongoDAO import MongoDAO
from mongoModel.Exam import Exam
from mongoModel.SocratQuestionnaire import SocratQuestionnaire
from mongoModel.StudentAction import START_EXAM_TYPE, SUBMIT_EXAM_TYPE
from services.mailService import MailService
from services.studentAuthUrlService import generate_auth_validation_url
from sessions.sessionManagement import clear_session, STUDENT_ROLE, build_user_context_from_session, \
    init_exam_composition_session, init_admin_session, init_socrat_composition_session

LOG = logging.getLogger(__name__)

DFLT_FERNET_KEY = b'WRfY1CgEmfvGEY4DRhxgSbpt2obQCe4cd7rx1qvGeto='


def encrypt_exam_chat_api_keys(exam: Exam) -> Exam:
    key = current_app.config.get('API_PV_KEY_ENC_KEY')
    if key is None:
        LOG.warning("No key provided to encrypt chat api keys. Use default. Unsecured.")
        key = DFLT_FERNET_KEY
    if 'selected_chats' not in exam:
        return exam
    f_cypher = Fernet(key.encode('UTF-8'))
    for chat_value in exam['selected_chats'].values():
        if 'api_key' in chat_value:
            chat_value['api_key'] = f_cypher.encrypt(chat_value['api_key'].encode('UTF-8')).decode('UTF-8')
    return exam


def encrypt_socrat_chat_api_keys(socrat: SocratQuestionnaire) -> SocratQuestionnaire:
    key = current_app.config.get('API_PV_KEY_ENC_KEY')
    if key is None:
        LOG.warning("No key provided to encrypt chat api keys. Use default. Unsecured.")
        key = DFLT_FERNET_KEY
    if 'selected_chat' not in socrat:
        return socrat
    LOG.info("herrre")
    LOG.info(socrat)
    if 'api_key' in socrat['selected_chat']:
        if socrat['selected_chat']['api_key'] is not None :
            f_cypher = Fernet(key.encode('UTF-8'))
            socrat['selected_chat']['api_key'] = f_cypher.encrypt(socrat['selected_chat']['api_key']
                                                                .encode('UTF-8')).decode('UTF-8')
    return socrat


def decrypt_exam_chat_api_keys(exam: Exam) -> Exam:
    key = current_app.config.get('API_PV_KEY_ENC_KEY')
    if key is None:
        LOG.warning("No key provided to encrypt chat api keys. Use default. Unsecured.")
        key = DFLT_FERNET_KEY
    if 'selected_chats' not in exam:
        return exam
    f_cypher = Fernet(key.encode('UTF-8'))
    for chat_value in exam['selected_chats'].values():
        if 'api_key' in chat_value:
            chat_value['api_key'] = f_cypher.decrypt(chat_value['api_key'].encode('UTF-8')).decode('UTF-8')
    return exam


def decrypt_socrat_chat_api_keys(socrat: SocratQuestionnaire) -> SocratQuestionnaire:
    key = current_app.config.get('API_PV_KEY_ENC_KEY')
    if key is None:
        LOG.warning("No key provided to encrypt chat api keys. Use default. Unsecured.")
        key = DFLT_FERNET_KEY
    if 'selected_chat' not in socrat:
        return socrat
    if 'api_key' in socrat['selected_chat']:
        if socrat['selected_chat']['api_key'] is not None :
            f_cypher = Fernet(key.encode('UTF-8'))
            socrat['selected_chat']['api_key'] = f_cypher.decrypt(socrat['selected_chat']['api_key']
                                                                .encode('UTF-8')).decode('UTF-8')
    return socrat


def decrypt_chat_api_key(enc: str) -> str:
    if not enc:
        return enc
    key = current_app.config.get('API_PV_KEY_ENC_KEY')
    if key is None:
        LOG.warning("No key provided to encrypt chat api keys. Use default. Unsecured.")
        key = DFLT_FERNET_KEY
    f_cypher = Fernet(key.encode('UTF-8'))
    return f_cypher.decrypt(enc.encode('UTF-8')).decode('UTF-8')


def get_ticket_security_key():
    secret_key = current_app.config.get('TICKET_STUDENT_KEY')
    if secret_key is None:
        LOG.warning('Security ticket student key is not given, setup an unsecure key')
        return 'my_secret_key'
    return secret_key


def get_ticket_salt_key():
    return current_app.config.get('TICKET_STUDENT_SALT', "chat-ai-exam-srv")


def hash_password(password: str) -> Optional[str]:
    if not password:
        return None
    return hashlib.sha3_512(password.encode()).hexdigest()


def create_exam_composition_url_ticket(exam_id: str, username: str, token: str) -> str:
    secret_key = get_ticket_security_key()
    salt = get_ticket_salt_key()
    s1 = URLSafeSerializer(secret_key, salt=salt)
    return s1.dumps({
        'exam_id': exam_id,
        'username': username,
        'token': token,
        'type': 'exam',
    })


def create_socrat_composition_url_ticket(socrat_id: str, username: str, token: str) -> str:
    secret_key = get_ticket_security_key()
    salt = get_ticket_salt_key()
    s1 = URLSafeSerializer(secret_key, salt=salt)
    return s1.dumps({
        'socrat_id': socrat_id,
        'username': username,
        'token': token,
        'type': 'socrat',
    })


def load_composition_info_from_ticket(ticket: str) -> Dict[str, str]:
    secret_key = get_ticket_security_key()
    salt = get_ticket_salt_key()
    s1 = URLSafeSerializer(secret_key, salt=salt)
    return s1.loads(ticket)


def authenticate_user(username: str, password: str) -> None:
    if not username or not password:
        raise BadRequest("Missing username or password for authentication")
    mongo_dao = MongoDAO()
    user = userRepository.find_user_by_username(mongo_dao, username, with_password=True)
    if not user:
        raise Unauthorized("bad credential")
    hashed_given_pass = hash_password(password)
    if user['password'] != hashed_given_pass:
        raise Unauthorized("bad credential")
    # Create session info
    init_admin_session(username, user['role'])


def __initiate_student_exam_composition_access(exam_id: str, username: str) -> dict:
    # Retrieve exam students information
    mongo_dao = MongoDAO()
    student_access = examRepository.find_student_access_for_exam(mongo_dao, exam_id, username)
    if student_access is None:
        raise Unauthorized("User not authorized to access this exam")
    # If token not known, generate a new token and update course access
    token = student_access.get('access_token')
    if token is None:
        token = str(uuid4())
        examRepository.set_student_token(mongo_dao, exam_id, username, token)
    # Create an access ticket
    ticket = create_exam_composition_url_ticket(exam_id, username, token)
    # Create the access complete url
    access_url = generate_auth_validation_url(ticket)
    # According to the configuration, send mail or return url, or indicate teacher will provide the ticket manually
    response = dict(mail=False, teacher=False, url=None)
    if current_app.config.get('TICKET_COM_SEND_MAIL', False) is True:
        mail_svc = MailService()
        mail_svc.send_mail_for_exam_student_composition(student_access['username'], student_access['exam_name'],
                                                        access_url)
        response['mail'] = True
    if current_app.config.get('TICKET_COM_TEACHER', True) is True:
        response['teacher'] = True
    if current_app.config.get('TICKET_COM_ANSWER_ON_GENERATE', False) is True:
        response['url'] = access_url
    return response


def __initiate_student_socrat_composition_access(socrat_id: str, username: str) -> dict:
    # Retrieve exam students information
    mongo_dao = MongoDAO()
    student_access = socratRepository.find_student_access_for_socrat(mongo_dao, socrat_id, username)
    if student_access is None:
        raise Unauthorized("User not authorized to access this exam")
    # If token not known, generate a new token and update course access
    token = student_access.get('access_token')
    if token is None:
        token = str(uuid4())
        socratRepository.set_student_token(mongo_dao, socrat_id, username, token)
    # Create an access ticket
    ticket = create_socrat_composition_url_ticket(socrat_id, username, token)
    # Create the access complete url
    access_url = generate_auth_validation_url(ticket)
    # According to the configuration, send mail or return url, or indicate teacher will provide the ticket manually
    response = dict(mail=False, teacher=False, url=None)
    if current_app.config.get('TICKET_COM_SEND_MAIL', False) is True:
        mail_svc = MailService()
        mail_svc.send_mail_for_socrat_student_composition(student_access['username'], student_access['exam_name'],
                                                          access_url)
        response['mail'] = True
    if current_app.config.get('TICKET_COM_TEACHER', True) is True:
        response['teacher'] = True
    if current_app.config.get('TICKET_COM_ANSWER_ON_GENERATE', False) is True:
        response['url'] = access_url
    return response


def initiate_student_composition_access(exam_id: str, username: str, exam_type: str) -> dict:
    if not exam_id or not username or not exam_type:
        raise BadRequest("Missing information for authentication")
    if exam_type == 'exam':
        return __initiate_student_exam_composition_access(exam_id, username)
    elif exam_type == 'socrat':
        return __initiate_student_socrat_composition_access(exam_id, username)
    else:
        raise BadRequest("Wrong authentication information")


def initiate_all_student_composition_access(exam_id: str, exam_type: str) -> List[Dict[str, str]]:
    """
    Generate authentication url for all students of a base exam
    :param exam_id: the base exam id
    :param exam_type: the base exam type
    :return: A list of couple username/access_url
    """
    if not exam_id or not exam_type or exam_type not in ['exam', 'socrat']:
        raise BadRequest("Missing information for access initialization")
    # Retrieve the list of token for each user according to the exam type.
    mongo_dao = MongoDAO()
    if exam_type == 'socrat':
        student_accesses = socratRepository.find_all_student_access_for_socrat(mongo_dao, exam_id)
    else:
        student_accesses = examRepository.find_all_student_access_for_exam(mongo_dao, exam_id)
    # Generate a token then an access url for each user Create and set the token it if required
    authentication_urls = []
    if exam_type == 'socrat':
        ticket_generator = create_socrat_composition_url_ticket
    else:
        ticket_generator = create_exam_composition_url_ticket
    for student_access in student_accesses:
        # Create and set the token it if required
        username = student_access['username']
        token = student_access.get('access_token')
        if not token:
            token = str(uuid4())
            student_access['access_token'] = token
            if exam_type == 'socrat':
                socratRepository.set_student_token(mongo_dao, exam_id, username, token)
            else:
                examRepository.set_student_token(mongo_dao, exam_id, username, token)
        # Generate the ticket then the access url
        ticket = ticket_generator(exam_id, username, token)
        # Create the access complete url
        access_url = generate_auth_validation_url(ticket)
        # complete the list
        authentication_urls.append(dict(username=username, access_url=access_url))
    return authentication_urls


def __authenticate_student_for_exam_from_ticket(exam_id: str, username: str, token: str):
    if exam_id is None or username is None or token is None:
        raise Unauthorized("Missing credential")
    mongo_dao = MongoDAO()
    student_access = examRepository.find_student_access_for_exam(mongo_dao, exam_id, username)
    if student_access is None:
        raise Unauthorized("User not authorized to access this exam")
    good_token = student_access.get('access_token')
    if good_token is None or good_token != token:
        raise Unauthorized("Wrong token")

    # find student's actions for this exam related to its start or end
    exam_act = studentActionRepository.find_exam_action_for_student_for_exam(mongo_dao, username, exam_id)
    exam_started = False
    exam_ended = False
    timeout = None
    for action in exam_act:
        if action['action_type'] == START_EXAM_TYPE:
            exam_started = True
            timeout = action['timestamp'] + timedelta(minutes=student_access['duration_minutes'])
        elif action['action_type'] == SUBMIT_EXAM_TYPE:
            exam_ended = True
            timeout = None
        else:
            LOG.warning('Unmanaged action type for auth: %s.', action['action_type'])

    # set session info
    init_exam_composition_session(username, role=STUDENT_ROLE, exam_id=exam_id, exam_started=exam_started,
                                  exam_ended=exam_ended, timeout=timeout)


def __authenticate_student_for_socrat_from_ticket(socrat_id: str, username: str, token: str):
    if socrat_id is None or username is None or token is None:
        raise Unauthorized("Missing credential")
    mongo_dao = MongoDAO()
    student_access = socratRepository.find_student_access_for_socrat(mongo_dao, socrat_id, username)
    if student_access is None:
        raise Unauthorized("User not authorized to access this exam")
    good_token = student_access.get('access_token')
    if good_token is None or good_token != token:
        raise Unauthorized("Wrong token")

    # find student's actions for this exam related to its start or end
    socrat_act = studentActionRepository.find_exam_action_for_student_for_exam(mongo_dao, username, socrat_id)
    socrat_started = False
    socrat_ended = False
    for action in socrat_act:
        if action['action_type'] == START_EXAM_TYPE:
            socrat_started = True
        elif action['action_type'] == SUBMIT_EXAM_TYPE:
            socrat_ended = True
        else:
            LOG.warning('Unmanaged action type for auth: %s.', action['action_type'])

    # set session info
    init_socrat_composition_session(username, role=STUDENT_ROLE, socrat_id=socrat_id, socrat_started=socrat_started,
                                    socrat_ended=socrat_ended)


def authenticate_student_from_ticket(ticket: str) -> None:
    # Process authentication and identification
    try:
        student_info = load_composition_info_from_ticket(ticket)
    except BadData:
        raise Unauthorized("bad ticket")

    ticket_type = student_info.get('type')
    if ticket_type == 'exam':
        __authenticate_student_for_exam_from_ticket(student_info.get('exam_id'), student_info.get('username'),
                                                    student_info.get('token'))
    elif ticket_type == 'socrat':
        __authenticate_student_for_socrat_from_ticket(student_info.get('socrat_id'), student_info.get('username'),
                                                      student_info.get('token'))
    else:
        raise Unauthorized("bad ticket")


def get_user_context() -> None:
    return build_user_context_from_session()


def logout() -> None:
    clear_session()
