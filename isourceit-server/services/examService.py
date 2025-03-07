import logging
from datetime import datetime, timedelta
from typing import Mapping, cast, Optional, Union, Any, Dict

import pydantic
from werkzeug.exceptions import BadRequest, Unauthorized, NotFound

from mongoDAO import examRepository, studentActionRepository
from mongoDAO.MongoDAO import MongoDAO
from mongoModel.Exam import Exam
from mongoModel.StudentAction import START_EXAM_TYPE, WROTE_INITIAL_ANSWER_TYPE, ASK_CHAT_AI_TYPE, \
    EXTERNAL_RESOURCE_TYPE, WROTE_FINAL_ANSWER_TYPE, SUBMIT_EXAM_TYPE, CHANGED_QUESTION_TYPE
from services.ChatAIManager import ChatAIManager
from services.securityService import decrypt_exam_chat_api_keys, encrypt_exam_chat_api_keys
from services.studentAuthUrlService import generate_auth_generation_url
from sessions.sessionManagement import session_username, session_exam_id

__all__ = ['find_admin_exams_summary', 'find_admin_exam_by_id', 'create_exam', 'update_exam',
           'find_composition_exam_by_id']

LOG = logging.getLogger(__name__)


def find_admin_exams_summary() -> Any:
    username = session_username()
    mongo_dao = MongoDAO()
    return examRepository.find_exams_summary_for_author(mongo_dao, username)


def find_admin_exam_by_id(exam_id: str, with_action_summary: bool = False) -> Exam:
    mongo_dao = MongoDAO()
    exam: Exam = examRepository.find_exam_by_id(mongo_dao, exam_id)
    if exam is None:
        raise NotFound('Exam not found')
    # Replace the _id key by id key
    exam['id'] = str(exam['_id'])
    exam.pop('_id', None)
    # Remove the exam type field
    exam.pop('exam_type')
    # Inject sharing url for student auth
    exam['student_generation_auth_url'] = generate_auth_generation_url('exam', exam['id'])
    # Replace all student token by a marker of tokenAsked
    for student in exam.get('students', []):
        if 'access_token' in student:
            student.pop('access_token', None)
            student['asked_access'] = True
        else:
            student['asked_access'] = False
    # Remove all api key from another owner or decrypt them
    username = session_username()
    if username != exam['owner_username']:
        for chat_key, chat in exam.get('selected_chats', dict()).items():
            if 'api_key' in chat:
                chat.pop('api_key')
    else:
        # decrypt potential exam chat api keys
        exam = decrypt_exam_chat_api_keys(exam)

    # if action summary asked, get them and add them
    if with_action_summary:
        act_sum = studentActionRepository.find_action_summary_by_student_for_exam(mongo_dao, exam_id)
        act_sum_by_username = dict((a['username'], a) for a in act_sum)
        limit_dt = datetime.utcnow() - timedelta(minutes=exam['duration_minutes'])
        for student in exam.get('students', []):
            student_username = student['username']
            act_sum = act_sum_by_username.get(student_username, None)
            if act_sum:
                student['nb_actions'] = act_sum['nb_actions']
                student['submitted'] = act_sum['submitted']
                student['first_timestamp'] = act_sum['first_timestamp']
                student['ended_exam'] = True if (
                        student['first_timestamp'] < limit_dt or act_sum['submitted']) else False
            else:
                student['nb_actions'] = 0
                student['submitted'] = False
                student['first_timestamp'] = None
                student['ended_exam'] = False

    return exam


def create_exam(exam_data: Dict) -> Exam:
    # add creation date
    exam_data['created'] = datetime.utcnow()
    # add exam type
    exam_data['exam_type'] = 'exam'
    # set owner with current user
    username = session_username()
    exam_data['owner_username'] = username

    exam_to_create = cast(Exam, pydantic.create_model_from_typeddict(Exam)(**exam_data).dict())
    # remove potential id
    exam_to_create.pop('id', None)

    # ensure there is at least one question
    if not exam_to_create['questions']:
        raise BadRequest('Exam must have at least one question')

    # check that current username is in authors. Add it otherwise
    user_in_authors = any(filter(lambda a: a.get('username') == username, exam_to_create.get('authors')))
    if not user_in_authors:
        exam_to_create['authors'].append({'username': username})

    # encrypt potential exam chat api keys
    exam_to_create = encrypt_exam_chat_api_keys(exam_to_create)

    # create the exam
    mongo_dao = MongoDAO()
    exam_id = examRepository.create_exam(mongo_dao, exam_to_create)
    LOG.info(" --  exam to")
    LOG.info(exam_to_create)
    # inject id to the model to return and remove the _id and exam type
    exam_to_create['id'] = str(exam_id)
    exam_to_create.pop('_id', None)
    exam_to_create.pop('exam_type', None)
    LOG.info('Exam %s created with id %s.', exam_to_create['name'], exam_to_create['id'])
    return exam_to_create


def update_exam(exam_id: str, exam_data: dict) -> Exam:
    # Inject owner and creation date to avoid cast crash (but will not be used after)
    username = session_username()
    exam_data['owner_username'] = username
    exam_data['created'] = datetime.utcnow()
    exam_data['exam_type'] = 'exam'
    exam_to_update = cast(Exam, pydantic.create_model_from_typeddict(Exam)(**exam_data).dict())

    if exam_to_update['id'] != exam_id:
        raise BadRequest("Exam id mismatch between data and url")
    # remove the potential id and _id marker of the exam
    exam_to_update.pop('id', None)
    exam_to_update.pop('_id', None)

    # ensure there is at least one question
    if not exam_to_update['questions']:
        raise BadRequest('Exam must have at least one question')

    # retrieve exam to check its existence and check owner
    mongo_dao = MongoDAO()
    exam = examRepository.find_exam_by_id(mongo_dao, exam_id)
    if exam['owner_username'] != username:
        raise Unauthorized("Only authors might modify their exam")

    # check that no student has started the exam
    if studentActionRepository.has_exam_been_started(mongo_dao, exam_id):
        raise BadRequest("Exam already started")

    # update in local basic informations: name, description, questions, duration_minutes, selected_chats
    exam['name'] = exam_to_update['name']
    exam['description'] = exam_to_update['description']
    exam['questions'] = exam_to_update['questions']
    exam['duration_minutes'] = exam_to_update['duration_minutes']
    exam['selected_chats'] = exam_to_update['selected_chats']

    # encrypt potential exam chat api keys
    exam = encrypt_exam_chat_api_keys(exam)

    # update in local author : check that current username is an author
    exam['authors'] = exam_to_update['authors']
    user_in_authors = any(filter(lambda a: a.get('username') == username, exam.get('authors')))
    if not user_in_authors:
        exam['authors'].append({'username': username})

    # update students by merging
    old_student_dict = dict((student['username'], student) for student in exam['students'])
    for student in exam_to_update['students']:
        old_student = old_student_dict.get(student['username'], None)
        if old_student is not None:
            student.update(old_student)
    exam['students'] = exam_to_update['students']

    # update the exam
    examRepository.update_exam(mongo_dao, exam_id, exam)

    # return the exam with its id and without the exam type
    exam['id'] = str(exam_id)
    exam.pop('_id', None)
    exam.pop('exam_type', None)
    return exam


def find_composition_exam_by_id(exam_id: str) -> Optional[Union[Exam, Mapping]]:
    if exam_id != session_exam_id():
        raise Unauthorized('Unallowed to access this composition exam')

    # retrieve the exam
    mongo_dao = MongoDAO()
    exam = examRepository.find_exam_by_id(mongo_dao, exam_id, projection={
        'name': 1,
        'description': 1,
        'duration_minutes': 1,
        'questions': 1,
        'selected_chats': 1,
        'selected_search_engines' :1
    })
    if exam is None:
        raise NotFound("Exam not found")

    # retrieve the student's exam trace
    students_exam_actions = studentActionRepository.get_actions_for_student_for_exam(mongo_dao, session_username(),
                                                                                     exam_id)
    
    # Compute the full composition model
    chat_ai_mgr = ChatAIManager()
    chat_choices = chat_ai_mgr.compute_student_choice_from_exam(exam)
    LOG.info("    chat_choices")
    LOG.info(chat_choices)
    now = datetime.utcnow()
    composition_exam = {
        'id': str(exam['_id']),
        'name': exam['name'],
        'description': exam['description'],
        'duration_minutes': exam['duration_minutes'],
        'timeout': None,
        'chat_choices': chat_choices,
        'started': len(students_exam_actions) > 0,
        'ended': False,
        'current_question_idx': None,
        'nb_questions': len(exam['questions']),
        'questions': dict((e[0], {
            'id': e[0],
            'label': e[1],
            'init_answer': None,
            'final_answer': None,
            'chat_actions': dict((choice['id'], []) for choice in chat_choices),
            'resources': []
        }) for e in enumerate(exam['questions']))
    }

    # If No action return the model directly WITHOUT THE QUESTIONS
    if not composition_exam['started']:
        composition_exam.pop('questions', None)
        return composition_exam

    # the first trace should be the start exam action, but we might have sorting error, so we handle code flexibility
    first_trace_processed = False
    if students_exam_actions[0]['action_type'] == START_EXAM_TYPE:
        # compute timeout : start timestamp + duration
        timeout = students_exam_actions[0]['timestamp'] + timedelta(minutes=exam['duration_minutes'])
        composition_exam['timeout'] = timeout
        # if timeout < now : mark exam as ended and stop here
        if timeout <= now:
            composition_exam['ended'] = True
            return composition_exam
        first_trace_processed = True

    # the last trace might be an exam submit. In the case, no need to go further in trace processing
    if students_exam_actions[-1]['action_type'] == SUBMIT_EXAM_TYPE:
        # mark the exam as ended and return it
        composition_exam['ended'] = True
        return composition_exam

    # fulfill the model with actions
    actions_to_process = students_exam_actions[1:] if first_trace_processed else students_exam_actions
    for action in actions_to_process:
        if action['action_type'] == START_EXAM_TYPE:
            # compute timeout : start timestamp + duration
            timeout = action['timestamp'] + timedelta(minutes=exam['duration_minutes'])
            composition_exam['timeout'] = timeout
            # if timeout < now : mark exam as ended and stop here
            if timeout <= now:
                composition_exam['ended'] = True
                break

        elif action['action_type'] == WROTE_INITIAL_ANSWER_TYPE:
            question = composition_exam['questions'].get(action['question_idx'])
            if not question:
                LOG.warning('Got question trace for unexisting exam question')
                continue
            question['init_answer'] = action['text']

        elif action['action_type'] == ASK_CHAT_AI_TYPE:
            question = composition_exam['questions'].get(action['question_idx'])
            if not question:
                LOG.warning('Got question trace for unexisting exam question')
                continue
            chat = question['chat_actions'].get(action['chat_id'])
            if chat is None:
                LOG.warning('Got question trace for unexisting exam question')
                continue
            chat.append(dict(id=str(action['_id']), prompt=action['prompt'], answer=action['answer'],
                             timestamp=action['timestamp']))

        elif action['action_type'] == EXTERNAL_RESOURCE_TYPE:
            if action['removed'] is not None:
                continue
            question = composition_exam['questions'].get(action['question_idx'])
            if not question:
                LOG.warning('Got question trace for unexisting exam question')
                continue
            question['resources'].append(dict(id=str(action['_id']), title=action['title'],
                                              description=action['description'],
                                              rsc_type=action['rsc_type'], timestamp=action['timestamp']))

        elif action['action_type'] == WROTE_FINAL_ANSWER_TYPE:
            question = composition_exam['questions'].get(action['question_idx'])
            if not question:
                LOG.warning('Got question trace for unexisting exam question')
                continue
            question['final_answer'] = action['text']

        elif action['action_type'] == SUBMIT_EXAM_TYPE:
            # mark the exam as ended and return it
            composition_exam['ended'] = True

        elif action['action_type'] == CHANGED_QUESTION_TYPE:
            # mark the exam current question
            composition_exam['current_question_idx'] = action['next_question_idx']

        # Other action (eg.: LOST_FOCUS_TYPE) do not matter here

    # If the exam was started, not end and no current question, set the current question indicator on first question
    if composition_exam['started'] and not composition_exam['ended'] \
            and composition_exam['current_question_idx'] is None:
        composition_exam['current_question_idx'] = 0

    return composition_exam
