import logging
from datetime import datetime
from typing import Mapping, cast, Optional, Union, Any, Dict

import pydantic
from werkzeug.exceptions import BadRequest, Unauthorized, NotFound

from mongoDAO import studentActionRepository, socratRepository
from mongoDAO.MongoDAO import MongoDAO
from mongoModel.SocratQuestionnaire import SocratQuestionnaire
from mongoModel.StudentAction import START_EXAM_TYPE, WROTE_INITIAL_ANSWER_TYPE, ASK_CHAT_AI_TYPE, \
    EXTERNAL_RESOURCE_TYPE, WROTE_FINAL_ANSWER_TYPE, SUBMIT_EXAM_TYPE, CHANGED_QUESTION_TYPE
from services.ChatAIManager import ChatAIManager
from services.securityService import encrypt_socrat_chat_api_keys, decrypt_socrat_chat_api_keys
from services.studentAuthUrlService import generate_auth_generation_url
from sessions.sessionManagement import session_username, session_exam_id

__all__ = ['find_admin_socrats_summary', 'find_admin_socrat_by_id', 'create_socrat', 'update_socrat',
           'find_composition_socrat_by_id']

LOG = logging.getLogger(__name__)


def find_admin_socrats_summary() -> Any:
    username = session_username()
    mongo_dao = MongoDAO()
    return socratRepository.find_socrats_summary_for_author(mongo_dao, username)


def find_admin_socrat_by_id(socrat_id: str, with_action_summary: bool = False) -> SocratQuestionnaire:
    mongo_dao = MongoDAO()
    socrat: SocratQuestionnaire = socratRepository.find_socrat_by_id(mongo_dao, socrat_id)
    if socrat is None:
        raise NotFound('Exam not found')
    # Replace the _id key by id key
    socrat['id'] = str(socrat['_id'])
    socrat.pop('_id', None)
    # Remove the exam type field
    socrat.pop('exam_type')
    # Inject sharing url for student auth
    socrat['student_generation_auth_url'] = generate_auth_generation_url('socrat', socrat['id'])
    # Replace all student token by a marker of tokenAsked
    for student in socrat.get('students', []):
        if 'access_token' in student:
            student.pop('access_token', None)
            student['asked_access'] = True
        else:
            student['asked_access'] = False
    # Remove all api key from another owner or decrypt them
    username = session_username()
    if username != socrat['owner_username']:
        for chat_key, chat in socrat.get('selected_chat', dict()).items():
            if 'api_key' in chat:
                chat.pop('api_key')
    else:
        # decrypt potential exam chat api keys
        socrat = decrypt_socrat_chat_api_keys(socrat)

    # if action summary asked, get them and add them
    if with_action_summary:
        act_sum = studentActionRepository.find_action_summary_by_student_for_exam(mongo_dao, socrat_id)
        act_sum_by_username = dict((a['username'], a) for a in act_sum)
        for student in socrat.get('students', []):
            student_username = student['username']
            act_sum = act_sum_by_username.get(student_username, None)
            if act_sum:
                student['nb_actions'] = act_sum['nb_actions']
                student['submitted'] = act_sum['submitted']
                student['first_timestamp'] = act_sum['first_timestamp']
                student['ended_exam'] = True if act_sum['submitted'] else False
            else:
                student['nb_actions'] = 0
                student['submitted'] = False
                student['first_timestamp'] = None
                student['ended_exam'] = False

    return socrat


def create_socrat(socrat_data: Dict) -> SocratQuestionnaire:
    # add creation date
    socrat_data['created'] = datetime.utcnow()
    # add exam type
    socrat_data['exam_type'] = 'socrat'
    # set owner with current user
    username = session_username()
    socrat_data['owner_username'] = username

    socrat_to_create = cast(SocratQuestionnaire,
                            pydantic.create_model_from_typeddict(SocratQuestionnaire)(**socrat_data).dict())
    # remove potential id
    socrat_to_create.pop('id', None)

    # ensure there is one and only one chat api set
    if not socrat_to_create.get('selected_chat') or not socrat_to_create['selected_chat'].get('id'):
        raise BadRequest('Questionnaire must have exactly one AI chat set')

    # ensure there is at least one question
    if not socrat_to_create['questions']:
        raise BadRequest('Exam must have at least one question')

    # ensure all question are present with at least a question, an answer and maybe an init_prompt
    for question_dict in socrat_to_create['questions']:
        if 'question' not in question_dict:
            raise BadRequest('A question structure must have at least a question')
        if 'answer' not in question_dict:
            raise BadRequest('A question structure must have at least an answer')
        if len(question_dict) >= 3 and 'init_prompt' not in question_dict:
            raise BadRequest('A question structure must not have any other field than question, answer and init_prompt')

    # check that current username is in authors. Add it otherwise
    user_in_authors = any(filter(lambda a: a.get('username') == username, socrat_to_create.get('authors')))
    if not user_in_authors:
        socrat_to_create['authors'].append({'username': username})

    # encrypt potential exam chat api keys
    socrat_to_create = encrypt_socrat_chat_api_keys(socrat_to_create)

    # create the exam
    mongo_dao = MongoDAO()
    socrate_id = socratRepository.create_socrat(mongo_dao, socrat_to_create)

    # inject id to the model to return and remove the _id and exam type
    socrat_to_create['id'] = str(socrate_id)
    socrat_to_create.pop('_id', None)
    socrat_to_create.pop('exam_type', None)
    LOG.info('SocratQuestionnary %s created with id %s.', socrat_to_create['name'], socrat_to_create['id'])
    return socrat_to_create


def update_socrat(socrat_id: str, socrat_data: dict) -> SocratQuestionnaire:
    # Inject owner and creation date to avoid cast crash (but will not be used after)
    username = session_username()
    socrat_data['owner_username'] = username
    socrat_data['created'] = datetime.utcnow()
    socrat_data['exam_type'] = 'socrat'
    socrat_to_update = cast(SocratQuestionnaire,
                            pydantic.create_model_from_typeddict(SocratQuestionnaire)(**socrat_data).dict())

    if socrat_to_update['id'] != socrat_id:
        raise BadRequest("Exam id mismatch between data and url")
    # remove the potential id and _id marker of the exam
    socrat_to_update.pop('id', None)
    socrat_to_update.pop('_id', None)

    # ensure there is at least one question
    if not socrat_to_update['questions']:
        raise BadRequest('Exam must have at least one question')

    # ensure all question are present with at least a question, an answer and maybe an init_prompt
    for question_dict in socrat_to_update['questions']:
        if 'question' not in question_dict:
            raise BadRequest('A question structure must have at least a question')
        if 'answer' not in question_dict:
            raise BadRequest('A question structure must have at least an answer')
        if len(question_dict) >= 3 and 'init_prompt' not in question_dict:
            raise BadRequest(
                'A question structure must not have any other field than question, answer and init_prompt')

    # retrieve exam to check its existence and check owner
    mongo_dao = MongoDAO()
    socrat = socratRepository.find_socrat_by_id(mongo_dao, socrat_id)
    if socrat['owner_username'] != username:
        raise Unauthorized("Only authors might modify their exam")

    # check that no student has started the exam
    if studentActionRepository.has_exam_been_started(mongo_dao, socrat_id):
        raise BadRequest("Exam already started")

    # update in local basic informations: name, description, questions, duration_minutes, selected_chats
    socrat['name'] = socrat_to_update['name']
    socrat['description'] = socrat_to_update['description']
    socrat['questions'] = socrat_to_update['questions']
    socrat['selected_chat'] = socrat_to_update['selected_chat']

    # encrypt potential exam chat api keys
    socrat = encrypt_socrat_chat_api_keys(socrat)

    # update in local author : check that current username is an author
    socrat['authors'] = socrat_to_update['authors']
    user_in_authors = any(filter(lambda a: a.get('username') == username, socrat.get('authors')))
    if not user_in_authors:
        socrat['authors'].append({'username': username})

    # update students by merging
    old_student_dict = dict((student['username'], student) for student in socrat['students'])
    for student in socrat_to_update['students']:
        old_student = old_student_dict.get(student['username'], None)
        if old_student is not None:
            student.update(old_student)
    socrat['students'] = socrat_to_update['students']

    # update the exam
    socratRepository.update_socrat(mongo_dao, socrat_id, socrat)

    # return the exam with its id and without the exam type
    socrat['id'] = str(socrat_id)
    socrat.pop('_id', None)
    socrat.pop('exam_type', None)
    return socrat


def find_composition_socrat_by_id(socrat_id: str) -> Optional[Union[SocratQuestionnaire, Mapping]]:
    if socrat_id != session_exam_id():
        raise Unauthorized('Unallowed to access this composition Socrat questionnaire')

    # retrieve the exam
    mongo_dao = MongoDAO()
    socrat = socratRepository.find_socrat_by_id(mongo_dao, socrat_id, projection={
        'name': 1,
        'description': 1,
        'questions': 1,
        'selected_chat': 1
    })
    if socrat is None:
        raise NotFound("Socrat questionnaire not found")

    # retrieve the student's exam trace
    students_socrat_actions = studentActionRepository.get_actions_for_student_for_exam(mongo_dao, session_username(),
                                                                                       socrat_id)

    # Compute the full composition model
    chat_ai_mgr = ChatAIManager()
    chat_choices = chat_ai_mgr.compute_student_choice_from_socrat(socrat)
    now = datetime.utcnow()
    composition_socrat = {
        'id': str(socrat['_id']),
        'name': socrat['name'],
        'description': socrat['description'],
        'chat_choices': chat_choices,
        'started': len(students_socrat_actions) > 0,
        'ended': False,
        'current_question_idx': None,
        'nb_questions': len(socrat['questions']),
        'questions': dict((e[0], {
            'id': e[0],
            'label': e[1]['question'],
            'init_answer': None,
            'final_answer': None,
            'chat_actions': dict((choice['id'], []) for choice in chat_choices),
            'resources': []
        }) for e in enumerate(socrat['questions']))
    }

    # If No action return the model directly WITHOUT THE QUESTIONS
    if not composition_socrat['started']:
        composition_socrat.pop('questions', None)
        return composition_socrat

    # the first trace should be the start exam action, but we might have sorting error, so we handle code flexibility
    first_trace_processed = False
    if students_socrat_actions[0]['action_type'] == START_EXAM_TYPE:
        # do nothing else than marking the action
        first_trace_processed = True

    # the last trace might be an exam submit. In the case, no need to go further in trace processing
    if students_socrat_actions[-1]['action_type'] == SUBMIT_EXAM_TYPE:
        # mark the exam as ended and return it
        composition_socrat['ended'] = True
        return composition_socrat

    # fulfill the model with actions
    actions_to_process = students_socrat_actions[1:] if first_trace_processed else students_socrat_actions
    for action in actions_to_process:
        if action['action_type'] == START_EXAM_TYPE:
            # do nothing
            pass

        elif action['action_type'] == WROTE_INITIAL_ANSWER_TYPE:
            question = composition_socrat['questions'].get(action['question_idx'])
            if not question:
                LOG.warning('Got question trace for unexisting exam question')
                continue
            question['init_answer'] = action['text']

        elif action['action_type'] == ASK_CHAT_AI_TYPE:
            question = composition_socrat['questions'].get(action['question_idx'])
            if not question:
                LOG.warning('Got question trace for unexisting exam question')
                continue
            chat = question['chat_actions'].get(action['chat_id'])
            if chat is None:
                LOG.warning('Got question trace for unexisting exam question')
                continue
            chat.append(dict(id=str(action['_id']), prompt=action.get('prompt'), answer=action['answer'],
                             timestamp=action['timestamp']))

        elif action['action_type'] == EXTERNAL_RESOURCE_TYPE:
            if action['removed'] is not None:
                continue
            question = composition_socrat['questions'].get(action['question_idx'])
            if not question:
                LOG.warning('Got question trace for unexisting exam question')
                continue
            question['resources'].append(dict(id=str(action['_id']), title=action['title'],
                                              description=action['description'],
                                              rsc_type=action['rsc_type'], timestamp=action['timestamp']))

        elif action['action_type'] == WROTE_FINAL_ANSWER_TYPE:
            question = composition_socrat['questions'].get(action['question_idx'])
            if not question:
                LOG.warning('Got question trace for unexisting exam question')
                continue
            question['final_answer'] = action['text']

        elif action['action_type'] == SUBMIT_EXAM_TYPE:
            # mark the exam as ended and return it
            composition_socrat['ended'] = True

        elif action['action_type'] == CHANGED_QUESTION_TYPE:
            # mark the exam current question
            composition_socrat['current_question_idx'] = action['next_question_idx']

        # Other action (eg.: LOST_FOCUS_TYPE) do not matter here

    # If the exam was started, not end and no current question, set the current question indicator on first question
    if composition_socrat['started'] and not composition_socrat['ended'] \
            and composition_socrat['current_question_idx'] is None:
        composition_socrat['current_question_idx'] = 0

    return composition_socrat
