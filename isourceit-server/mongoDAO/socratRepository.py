from typing import Optional, Any, Dict, List

from bson import ObjectId

from mongoDAO.MongoDAO import MongoDAO

__all__ = ['create_socrat', 'update_socrat', 'find_socrat_by_id']

from mongoModel.SocratQuestionnaire import SocratQuestionnaire


def create_socrat(dao: MongoDAO, socrat: SocratQuestionnaire) -> str:
    if not socrat:
        raise Exception('Socrat required to create socrat questionnaire')
    if socrat['exam_type'] != 'socrat':
        raise Exception('Exam of wrong type')
    result = dao.socrat_col.insert_one(socrat)
    return str(result.inserted_id)


def update_socrat(dao: MongoDAO, socrat_id: str, socrat: SocratQuestionnaire) -> None:
    if not socrat:
        raise Exception('Socrat required to update esocrat questionnairexam')
    if socrat['exam_type'] != 'socrat':
        raise Exception('Exam of wrong type')
    result = dao.socrat_col.update_one({'_id': ObjectId(socrat_id)}, {
        '$set': socrat
    })
    if result.matched_count == 0:
        raise Exception('Socrat Id not found.')


def find_socrat_by_id(dao: MongoDAO, socrat_id: str, projection: Dict[str, int] = None) -> Optional[
    SocratQuestionnaire]:
    if not socrat_id:
        raise Exception('Id required to find socrat by id')
    if projection is not None and 'exam_type' not in projection:
        projection['exam_type'] = 1
    socrat_data = dao.socrat_col.find_one(ObjectId(socrat_id), projection=projection)
    if socrat_data:
        if socrat_data.get('exam_type') != 'socrat':
            raise Exception('Exam of wrong type')
        return SocratQuestionnaire(**socrat_data)
    else:
        return None


def find_socrats_summary_for_author(dao: MongoDAO, author_username: str) -> List[Any]:
    if not author_username:
        raise Exception('author required to find exams summary')
    result = dao.socrat_col.aggregate([
        {'$match': {'exam_type': 'socrat', 'authors.username': author_username}},
        {'$project': {
            'id': {'$toString': '$_id'},
            '_id': 0,
            'course_id': 1,
            'name': 1,
            'created': 1,
            'nb_questions': {'$size': '$questions'},
            'nb_students': {'$size': '$students'}
        }},
        {'$sort': {'created': 1}}
    ])
    return list(result)


def find_student_access_for_socrat(dao: MongoDAO, socrat_id: str, username: str) -> Optional[Dict]:
    if not socrat_id or not username:
        raise Exception('Id, username and token required to set student token for a socrat access')
    result = dao.socrat_col.aggregate([
        {'$match': {'_id': ObjectId(socrat_id), 'exam_type': 'socrat'}},
        {'$project': {'students': 1, 'name': 1}},
        {'$unwind': '$students'},
        {'$match': {'students.username': username}},
        {'$project': {
            'username': '$students.username',
            'access_token': '$students.access_token',
            'exam_id': {'$toString': '$_id'},
            'exam_name': '$name',
            '_id': 0
        }}
    ])
    return next(result, None)


def find_all_student_access_for_socrat(dao: MongoDAO, socrat_id: str) -> List[Any]:
    if not socrat_id:
        raise Exception('Id required to get students access for a socrat access')
    result = dao.socrat_col.aggregate([
        {'$match': {'_id': ObjectId(socrat_id), 'exam_type': 'socrat'}},
        {'$project': {'students': 1}},
        {'$unwind': '$students'},
        {'$project': {
            'username': '$students.username',
            'access_token': '$students.access_token',
            '_id': 0
        }}
    ])
    return list(result)


def set_student_token(dao: MongoDAO, socrat_id: str, username: str, token: str):
    if not socrat_id or not username or not token:
        raise Exception('Id, username and token required to set student token for a socrat access')
    result = dao.socrat_col.update_one(filter={
        '_id': ObjectId(socrat_id),
        'exam_type': 'socrat'
    }, update={
        '$set': {
            'students.$[elem].access_token': token
        }
    }, array_filters=[{
        'elem.username': username
    }])
    if result.modified_count == 0:
        raise Exception('Token not set.')
