from datetime import datetime
from typing import Any, Optional, List, Mapping

import pymongo
from bson import ObjectId

from mongoDAO.MongoDAO import MongoDAO
from mongoModel.StudentAction import StudentAction, ASK_CHAT_AI_TYPE, EXTERNAL_RESOURCE_TYPE, \
    STUDENT_ACTION_TYPE_MAPPING, START_EXAM_TYPE, SUBMIT_EXAM_TYPE

__all__ = ['create_student_action', 'add_chat_ai_answer', 'mark_external_resource_removed',
           'get_actions_for_student_for_exam', 'update_chat_ai_answer', 'set_chat_ai_achieved',
           'find_last_chat_ai_model_interactions','update_comment_on_answer']


def create_student_action(dao: MongoDAO, student_action: StudentAction) -> str:
    if not student_action:
        raise Exception('Student action required to create student action')
    result = dao.student_action_col.insert_one(student_action)
    return str(result.inserted_id)


def add_chat_ai_answer(dao: MongoDAO, chat_ai_id: str, answer: str, achieved: bool = True) -> None:
    if not chat_ai_id:
        raise Exception('Chat AI id required to add chat ai answer')
    result = dao.student_action_col.update_one({
        '_id': ObjectId(chat_ai_id),
        'action_type': ASK_CHAT_AI_TYPE
    }, {
        '$set': {
            'answer': answer,
            'achieved': achieved
        }
    })
    if result.modified_count == 0:
        raise Exception('Chat AI Id not found or action type mismatch.')



def update_chat_ai_answer(dao: MongoDAO, chat_ai_id: str, answer: str, achieved: bool = False) -> None:
    if not chat_ai_id:
        raise Exception('Chat AI id required to add chat ai answer')
    result = dao.student_action_col.update_one({
        '_id': ObjectId(chat_ai_id),
        'action_type': ASK_CHAT_AI_TYPE
    }, [{
        '$set': {
            'answer': {
                '$cond': [
                    {'$eq': ['$answer', None]},
                    answer,
                    {'$concat': ['$answer', answer]}
                ]
            },
            'achieved': achieved
        }
    }])
    if result.modified_count == 0:
        raise Exception('Chat AI Id not found or action type mismatch.')

def update_comment_on_answer(dao: MongoDAO, chat_ai_id: str, comment: str) -> None:
    if not chat_ai_id:
        raise Exception('Chat AI id required to add chat ai answer')
    result = dao.student_action_col.update_one({
        '_id': ObjectId(chat_ai_id),
        'action_type': ASK_CHAT_AI_TYPE
    }, [{
        '$set': {
            'comment': comment
        }
    }])
    if result.modified_count == 0:
        raise Exception('Chat AI Id not found or action type mismatch.')

def set_chat_ai_achieved(dao: MongoDAO, chat_ai_id: str, achieved: bool) -> None:
    if not chat_ai_id:
        raise Exception('Chat AI id required to add chat ai answer')
    result = dao.student_action_col.update_one({
        '_id': ObjectId(chat_ai_id),
        'action_type': ASK_CHAT_AI_TYPE
    }, {
        '$set': {
            'achieved': achieved
        }
    })
    if result.modified_count == 0:
        raise Exception('Chat AI Id not found or action type mismatch.')


def find_action_by_id(dao: MongoDAO, action_id: str) -> Optional[StudentAction]:
    if not action_id:
        raise Exception('Id required to find action by id')
    action_data = dao.student_action_col.find_one(ObjectId(action_id))
    if action_data:
        action_type = action_data.get('action_type')
        if not action_type or not STUDENT_ACTION_TYPE_MAPPING.get(action_type):
            return action_data
        student_action_class = STUDENT_ACTION_TYPE_MAPPING[action_type]
        return student_action_class(**action_data)
    else:
        return None


def mark_external_resource_removed(dao: MongoDAO, resource_id: str, timestamp: Optional[datetime]) -> None:
    if not resource_id:
        raise Exception('External resource id required to add chat ai answer')
    now = timestamp if timestamp else datetime.now()
    result = dao.student_action_col.update_one({
        '_id': ObjectId(resource_id),
        'action_type': EXTERNAL_RESOURCE_TYPE
    }, {
        '$set': {
            'removed': now
        }
    })
    if result.modified_count == 0:
        raise Exception('External resource Id not found or action type mismatch.')


def get_actions_for_student_for_exam(dao: MongoDAO, username: str, exam_id: str,
                                     projection: Mapping[str, int] = None) -> List[StudentAction]:
    result = dao.student_action_col.find(
        filter={
            'exam_id': exam_id,
            'student_username': username
        },
        projection=projection,
        sort=[('timestamp', pymongo.ASCENDING)]
    )
    return list(result)


def has_exam_been_started(dao: MongoDAO, exam_id: str) -> bool:
    result = dao.student_action_col.find_one({
        'exam_id': exam_id,
    })
    return result is not None


def find_exam_action_for_student_for_exam(dao: MongoDAO, username: str, exam_id: str) -> List[StudentAction]:
    result = dao.student_action_col.find(
        filter={
            'exam_id': exam_id,
            'student_username': username,
            'action_type': {
                '$in': [START_EXAM_TYPE, SUBMIT_EXAM_TYPE]
            }
        },
        sort=[('timestamp', pymongo.ASCENDING)]
    )
    return list(result)


def find_action_summary_by_student_for_exam(dao: MongoDAO, exam_id: str) -> List[Any]:
    result = dao.student_action_col.aggregate([
        {'$match': {'exam_id': exam_id}},
        {'$project': {
            '_id': 0,
            'username': '$student_username',
            'submitted': {'$cond': [{'$eq': ['$action_type', SUBMIT_EXAM_TYPE]}, 1, 0]},
            'timestamp': 1
        }},
        {'$group': {
            '_id': '$username',
            'nb_actions': {'$count': {}},
            'submitted': {'$max': '$submitted'},
            'first_timestamp': {'$min': '$timestamp'}
        }},
        {'$project': {
            'username': '$_id',
            '_id': 0,
            'nb_actions': 1,
            'submitted': {'$toBool': '$submitted'},
            'first_timestamp': 1
        }}
    ])
    return list(result)


def find_last_chat_ai_model_interactions(dao: MongoDAO, username: str, exam_id: str, question_idx: int,
                                         chat_id: str) -> List[Any]:
    result = dao.student_action_col.find(
        filter={
            'exam_id': exam_id,
            'student_username': username,
            'question_idx': question_idx,
            'action_type': ASK_CHAT_AI_TYPE,
            'chat_id': chat_id

        },
        sort=[('timestamp', pymongo.ASCENDING)],
        projection={
            '_id': 0,
            'prompt': 1,
            'hidden_prompt': 1,
            'answer': 1,
            'achieved': 1,
        }
    )
    return list(result)


def has_chat_ai_model_interaction(dao: MongoDAO, username: str, exam_id: str, question_idx: int,
                                  chat_id: str) -> bool:
    result = dao.student_action_col.find_one(
        filter={
            'exam_id': exam_id,
            'student_username': username,
            'question_idx': question_idx,
            'action_type': ASK_CHAT_AI_TYPE,
            'chat_id': chat_id

        },
        projection={
            '_id': 1
        }
    )
    return result is not None
