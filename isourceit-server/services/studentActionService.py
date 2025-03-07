import logging
from datetime import datetime, timedelta
from typing import Mapping, cast, Dict, Iterable, Any

import pydantic
from flask import current_app
from werkzeug.exceptions import Unauthorized, BadRequest

from mongoDAO import studentActionRepository, examRepository, socratRepository
from mongoDAO.MongoDAO import MongoDAO
from mongoModel.Exam import Exam
from mongoModel.SocratQuestionnaire import SocratQuestionnaire
from mongoModel.StudentAction import STUDENT_ACTION_TYPE_MAPPING, EXTERNAL_RESOURCE_TYPE, \
    AskChatAI, StartExam, SubmitExam, ExternalResource, SearchEngine,VisitUrl, \
    WroteInitialAnswer, WroteFinalAnswer, StudentAction, ChangedQuestion, LostFocus
from services import ChatAIManager
from services.SearchEnginesManager import BingSearchClient,BraveSearch
from services.ChatAIManager import ChatAIManager
from services.securityService import decrypt_chat_api_key
from sessions.sessionManagement import session_username, update_session_student_info, \
    is_exam_ended, is_exam_started, session_exam_id, get_ws_sid, session_exam_type

LOG = logging.getLogger(__name__)


def __forge_init_socrat_prompt(socrat_question: dict):
    return "The question is: %s%s\n\nFinal Answer is: %s%s" % (
        socrat_question['question'],
        '' if socrat_question['question'].endswith('.') or socrat_question['question'].endswith('?') else '.',
        socrat_question['answer'],
        '' if socrat_question['answer'].endswith('.') or socrat_question['answer'].endswith('?') else '.')


def __prepare_action(action_data: Dict, action_class: Any) -> Any:
    # Inject / force username, course id and student username
    if not action_data.get('timestamp', None):
        action_data['timestamp'] = datetime.utcnow()
    action_data['exam_id'] = session_exam_id()
    action_data['student_username'] = session_username()
    LOG.info("___handleeee")
    LOG.info(action_class)
    LOG.info(action_data)
    action = cast(action_class, pydantic.create_model_from_typeddict(action_class)(**action_data).dict())
    # remove action id and _id
    action.pop('id', None)
    action.pop('_id', None)
    return action


def __handle_exam_action(action_data: Dict, action_class: Any, exam: Exam, mongo_dao: MongoDAO) -> Mapping:
    # Clean action_data and creation action instance
    action = __prepare_action(action_data, action_class)
    LOG.info("___handleeee")
    LOG.info(action)
    if action_class == StartExam:
        if is_exam_started():
            raise BadRequest('Cannot handle Start exam action; exam already started')
        # create action
        action_id = studentActionRepository.create_student_action(mongo_dao, action)
        # update session with exam started marker and timeout
        timeout = action_data['timestamp'] + timedelta(minutes=exam['duration_minutes'])
        update_session_student_info(exam_started=True, timeout=timeout)
        return {
            'timestamp': action['timestamp'],
            'id': action_id,
            'e xam_started': True,
            'timeout': timeout
        }

    # if action type is SUBMIT_EXAM_TYPE: assert exam is started, then update session
    if action_class == SubmitExam:
        if not is_exam_started():
            raise BadRequest('Cannot handle Submit exam action; exam not started')
        # create action
        action_id = studentActionRepository.create_student_action(mongo_dao, action)
        update_session_student_info(exam_ended=True)
        return {
            'timestamp': action['timestamp'],
            'id': action_id,
            'exam_ended': True
        }

    # otherwise action is relative to a question. Exam should be started
    if not is_exam_started():
        raise BadRequest('Cannot handle Submit exam action; exam not started')

    # Check action question idx is given and relative to an existing question
    if action.get('question_idx') is None or action['question_idx'] < 0 or action['question_idx'] > len(
            exam['questions']):
        raise BadRequest('Bad question idx')

    # if action is asking to a chat: check the chat key is allowed and prompt given
    if action_class == AskChatAI:
        if action['chat_id'] not in exam['selected_chats']:
            raise BadRequest("Bad chat key")
        if not action['prompt']:
            raise BadRequest("Missing prompt")

    # save action into db
    action_id = studentActionRepository.create_student_action(mongo_dao, action)
    LOG.info(" eexaam --")
    LOG.info(exam)
    # process response and specific handling of action
    if action_class == ChangedQuestion:
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'next_question_idx': action['next_question_idx'],
            'id': action_id
        }
    elif action_class == LostFocus:
        return {
            'timestamp': action['timestamp'],
            'question_idx': action.get('question_idx', None),
            'id': action_id,
            'return_timestamp': action['return_timestamp'],
            'duration_seconds': action['duration_seconds'],
            'page_hidden': action['page_hidden'],
        }
    elif action_class == AskChatAI:
        LOG.info(" -ask chata")
        LOG.info(action)
        exam_chat_settings = exam['selected_chats'].get(action['chat_id'])
        if exam_chat_settings is None:
            LOG.warning('no exam chat sttings for chat_id {}'.format(action['chat_id']))
            raise BadRequest('Bad chat_id')
        private_key = decrypt_chat_api_key(exam_chat_settings.get('api_key', None))
        chat_ai_mgr = ChatAIManager()
        ws_sid = get_ws_sid()
        result = {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id,
            'chat_id': action['chat_id'],
            'chat_key': action['chat_key'],
            'prompt': action['prompt'],
        }
        if ws_sid is not None:
            LOG.warning("ws_ssiiiiss is not None")
            #find custom init prompt of the current question
            exam = examRepository.find_exam_by_id(mongo_dao, action["exam_id"])
            custom_init_prompt = exam["questions"][action["question_idx"]]["prompt_intruction"]
            chat_ai_mgr.process_prompt(action_id, action, ws_sid, custom_init_prompt=custom_init_prompt,private_key=private_key)
        else:
            LOG.warning('No ws id, will not be able to return reponse!')
            result['achieved'] = True
            result['answer'] = '<Chat service connection error. Unable to process the promp>'
        return result
    
    elif action_class == SearchEngine:
        LOG.info("     search ---")
        LOG.info(action)
        exam_search_engine_settings = exam['selected_search_engines'].get(action['search_engine_id'])
        if exam_search_engine_settings is None:
            LOG.warning('no exam chat sttings for chat_id {}'.format(action['search_engine_id']))
            raise BadRequest('Bad chat_id')
        if "Bing" in action["search_engine_id"]:
            private_key = decrypt_chat_api_key(exam_search_engine_settings.get('api_key', None))
            bing_search = BingSearchClient(private_key)
            result = bing_search.search(action["query"])          
        if "Brave" in action["search_engine_id"]:
            private_key = decrypt_chat_api_key(exam_search_engine_settings.get('api_key', None))
            brave_search = BraveSearch(private_key)
            result = brave_search.search(action["query"])
        if result is None : 
            return [{"title":"Not found","description":"The search engine does not work","url":""}]
        else:
            return result
       
    
    elif action_class == VisitUrl:
        LOG.info("   visit url --- ")
        res = {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id,
            'search_engine_name': action['search_engine_name'],
            'url': action['url'],
        }
       
        return res
    
    elif action_class == ExternalResource:
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id,
            'title': action['title'],
            'description': action['description'],
            'rsc_type': action['rsc_type'],
            'removed': False
        }
    elif action_class in (WroteInitialAnswer, WroteFinalAnswer):
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id,
            'text': action['text']
        }
    else:
        LOG.warning('Warning action type unmanaged: %s.', action['action_type'])
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id
        }


def __handle_socrat_action(action_data: Dict, action_class: Any, socrat: SocratQuestionnaire,
                           mongo_dao: MongoDAO) -> Mapping:
    # Clean action_data and creation action instance
    action = __prepare_action(action_data, action_class)

    # if action type is START_EXAM_TYPE: assert exam is not started, then update session
    if action_class == StartExam:
        if is_exam_started():
            raise BadRequest('Cannot handle Start exam action; exam already started')
        # create action
        action_id = studentActionRepository.create_student_action(mongo_dao, action)
        # update session with exam started marker and timeout
        update_session_student_info(exam_started=True)
        return {
            'timestamp': action['timestamp'],
            'id': action_id,
            'exam_started': True
        }

    # if action type is SUBMIT_EXAM_TYPE: assert exam is started, then update session
    if action_class == SubmitExam:
        if not is_exam_started():
            raise BadRequest('Cannot handle Submit exam action; exam not started')
        # create action
        action_id = studentActionRepository.create_student_action(mongo_dao, action)
        update_session_student_info(exam_ended=True)
        return {
            'timestamp': action['timestamp'],
            'id': action_id,
            'exam_ended': True
        }

    # otherwise action is relative to a question. Exam should be started
    if not is_exam_started():
        raise BadRequest('Cannot handle Submit exam action; exam not started')

    # Check action question idx is given and relative to an existing question
    if action.get('question_idx') is None or action['question_idx'] < 0 or action['question_idx'] > len(
            socrat['questions']):
        raise BadRequest('Bad question idx')

    # if action is asking to a chat: check the chat key is allowed, then check if its the first time or not
    if action_class == AskChatAI:
        if action['chat_id'] != socrat['selected_chat'].get('id'):
            raise BadRequest("Bad chat key")
        if not studentActionRepository.has_chat_ai_model_interaction(mongo_dao, session_username(), session_exam_id(),
                                                                     action['question_idx'], action['chat_id']):
            # remove any prompt and set hidden prompt with the question init prompt
            action['prompt'] = None
            action['hidden_prompt'] = __forge_init_socrat_prompt(socrat['questions'][action['question_idx']])
        elif not action['prompt']:
            raise BadRequest("Missing prompt")

    # save action into db
    action_id = studentActionRepository.create_student_action(mongo_dao, action)

    # process response and specific handling of action
    if action_class == ChangedQuestion:
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'next_question_idx': action['next_question_idx'],
            'id': action_id
        }
    elif action_class == LostFocus:
        return {
            'timestamp': action['timestamp'],
            'question_idx': action.get('question_idx', None),
            'id': action_id,
            'return_timestamp': action['return_timestamp'],
            'duration_seconds': action['duration_seconds'],
            'page_hidden': action['page_hidden'],
        }
    elif action_class == AskChatAI:
        if action['chat_id'] != socrat['selected_chat'].get('id'):
            raise BadRequest("Bad chat key")
        private_key = decrypt_chat_api_key(socrat['selected_chat'].get('api_key', None))
        chat_ai_mgr = ChatAIManager()
        ws_sid = get_ws_sid()
        result = {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id,
            'chat_id': action['chat_id'],
            'chat_key': action['chat_key'],
            'prompt': action.get('prompt'),
        }
        custom_init_prompt = socrat['questions'][action['question_idx']] \
            .get('init_prompt', current_app.config.get('DEFAULT_SOCRAT_INIT_PROMPT'))
        custom_temperature = current_app.config.get('DEFAULT_SOCRAT_CHAT_TEMPERATURE', 0.2)
        if ws_sid is not None:
            chat_ai_mgr.process_prompt(action_id, action, ws_sid, private_key=private_key,
                                       custom_init_prompt=custom_init_prompt, custom_temperature=custom_temperature)
        else:
            LOG.warning('No ws id, will not be able to return reponse!')
            result['achieved'] = True
            result['answer'] = '<Chat service connection error. Unable to process the promp>'
        return result
    elif action_class == ExternalResource:
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id,
            'title': action['title'],
            'description': action['description'],
            'rsc_type': action['rsc_type'],
            'removed': False
        }
    elif action_class in (WroteInitialAnswer, WroteFinalAnswer):
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id,
            'text': action['text']
        }
    else:
        LOG.warning('Warning action type unmanaged: %s.', action['action_type'])
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id
        }

def handle_comment_answer(action_id:str, comment:str) -> None:
    if not is_exam_started() or is_exam_ended():
        raise Unauthorized('Exam must be started and not ended')

    # Get action
    mongo_dao = MongoDAO()
    studentActionRepository.update_comment_on_answer(mongo_dao, action_id, comment) 
    return "updated"

def handle_action(action_data: Dict) -> Mapping:
    # In any case check exam is not finished
    LOG.info("hhanndl")
    LOG.info(action_data)
    if is_exam_ended():
        raise Unauthorized('Exam must not be ended')

    # check that action_data has at least a proper type
    if 'action_type' not in action_data:
        raise BadRequest("Missing action type")
    # cast action according to action type
    action_class = STUDENT_ACTION_TYPE_MAPPING.get(action_data['action_type'], None)

    if action_class is None:
        action_class = action_data['action_type']
        if action_class is None:
            raise BadRequest("Bad action type")

    # According to the exam type, retrieve the proper exam object and call the proper treatment
    mongo_dao = MongoDAO()
    if session_exam_type() == 'exam':
        # retrieve exam Info: duration_minutes, questions
        exam = examRepository.find_exam_by_id(mongo_dao, session_exam_id(),
                                              projection={'duration_minutes': 1,
                                                          'questions': 1,
                                                          'selected_chats': 1,
                                                          'selected_search_engines': 1,})
        if exam is None:
            raise BadRequest("No exam matching session exam id")
        return __handle_exam_action(action_data, action_class, exam, mongo_dao)
    elif session_exam_type() == 'socrat':
        # retrieve exam Info: questions
        socrat = socratRepository.find_socrat_by_id(mongo_dao, session_exam_id(),
                                                    projection={'questions': 1, 'selected_chat': 1})
        if socrat is None:
            raise BadRequest("No Socrat questionnary matching session socrat id")
        return __handle_socrat_action(action_data, action_class, socrat, mongo_dao)
    else:
        raise Unauthorized('Unproper session exam type (' + session_exam_type() + ')')


def mark_external_resource_removed(action_id) -> None:
    # check exam is started but not finished
    if not is_exam_started() or is_exam_ended():
        raise Unauthorized('Exam must be started and not ended')

    # Get action
    mongo_dao = MongoDAO()
    action = studentActionRepository.find_action_by_id(mongo_dao, action_id)
    # check action properties with session info: exam_id, question_idx, student_username,
    # check action_type is EXTERNAL_RESOURCE_TYPE
    if action['exam_id'] != session_exam_id() \
            or action['student_username'] != session_username() \
            or action['action_type'] != EXTERNAL_RESOURCE_TYPE:
        raise Unauthorized("Unauthorized action modification")
    # check resource not already removed
    if action['removed'] is not None:
        raise BadRequest("Action already removed")
    # mak action as removed
    studentActionRepository.mark_external_resource_removed(mongo_dao, action_id, datetime.now())


def get_exam_student_actions(exam_id: str, student_username: str) -> Iterable[StudentAction]:
    # retrieve exam to check its existence and check authors
    current_username = session_username()
    mongo_dao = MongoDAO()
    # Attempt to retrieve exam or socrat
    exam = examRepository.find_exam_by_id(mongo_dao, exam_id, projection={'authors': 1})
    if not any(
            filter(lambda uname: uname == current_username, map(lambda author: author['username'], exam['authors']))):
        raise Unauthorized("Only authors might modify their exam")
    # Remove _id, id and exam_id
    projection = {
        '_id': 0,
        'id': 0,
        'exam_id': 0
    }
    return studentActionRepository.get_actions_for_student_for_exam(mongo_dao, username=student_username,
                                                                    exam_id=exam_id, projection=projection)


def get_socrat_student_actions(socrat_id: str, student_username: str) -> Iterable[StudentAction]:
    # retrieve exam to check its existence and check authors
    current_username = session_username()
    mongo_dao = MongoDAO()
    # Attempt to retrieve exam or socrat
    exam = socratRepository.find_socrat_by_id(mongo_dao, socrat_id, projection={'authors': 1})
    if not any(
            filter(lambda uname: uname == current_username, map(lambda author: author['username'], exam['authors']))):
        raise Unauthorized("Only authors might modify their exam")
    # Remove _id, id and exam_id
    projection = {
        '_id': 0,
        'id': 0,
        'exam_id': 0
    }
    return studentActionRepository.get_actions_for_student_for_exam(mongo_dao, username=student_username,
                                                                    exam_id=socrat_id, projection=projection)
