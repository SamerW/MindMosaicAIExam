from typing import Optional, Any, Dict, List

from bson import ObjectId
from werkzeug.exceptions import NotFound

from mongoDAO.MongoDAO import MongoDAO
from mongoModel.Exam import Exam

__all__ = ['create_exam', 'update_exam', 'find_exam_by_id']


def create_exam(dao: MongoDAO, exam: Exam) -> str:
    if not exam:
        raise Exception('Exam required to create exam')
    if exam['exam_type'] != 'exam':
        raise Exception('Exam of wrong type')
    result = dao.exam_col.insert_one(exam)
    return str(result.inserted_id)


def update_exam(dao: MongoDAO, exam_id: str, exam: Exam) -> None:
    if not exam:
        raise Exception('Exam required to update exam')
    if exam['exam_type'] != 'exam':
        raise Exception('Exam of wrong type')
    result = dao.exam_col.update_one({'_id': ObjectId(exam_id)}, {
        '$set': exam
    })
    if result.matched_count == 0:
        raise Exception('Exam Id not found.')


def find_exam_by_id(dao: MongoDAO, exam_id: str, projection: Dict[str, int] = None) -> Optional[Exam]:
    if not exam_id:
        raise Exception('Id required to find exam by id')
    if projection is not None and 'exam_type' not in projection:
        projection['exam_type'] = 1
    exam_data = dao.exam_col.find_one(ObjectId(exam_id), projection=projection)
    if exam_data:
        if exam_data.get('exam_type') != 'exam':
            raise NotFound('Exam of wrong type')
        return Exam(**exam_data)
    else:
        return None


def find_exams_summary_for_author(dao: MongoDAO, author_username: str) -> List[Any]:
    if not author_username:
        raise Exception('author required to find exams summary')
    result = dao.exam_col.aggregate([
        {'$match': {'exam_type': 'exam', 'authors.username': author_username}},
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


def find_student_access_for_exam(dao: MongoDAO, exam_id: str, username: str) -> Optional[Dict]:
    if not exam_id or not username:
        raise Exception('Id, username and token required to set student token for an exam access')
    result = dao.exam_col.aggregate([
        {'$match': {'_id': ObjectId(exam_id), 'exam_type': 'exam'}},
        {'$project': {'students': 1, 'duration_minutes': 1, 'name': 1}},
        {'$unwind': '$students'},
        {'$match': {'students.username': username}},
        {'$project': {
            'username': '$students.username',
            'access_token': '$students.access_token',
            'exam_id': {'$toString': '$_id'},
            'exam_name': '$name',
            'duration_minutes': 1,
            '_id': 0
        }}
    ])
    return next(result, None)


def find_all_student_access_for_exam(dao: MongoDAO, exam_id: str) -> List[Any]:
    if not exam_id:
        raise Exception('Id required to get students access for an exam access')
    result = dao.exam_col.aggregate([
        {'$match': {'_id': ObjectId(exam_id), 'exam_type': 'exam'}},
        {'$project': {'students': 1}},
        {'$unwind': '$students'},
        {'$project': {
            'username': '$students.username',
            'access_token': '$students.access_token',
            '_id': 0
        }}
    ])
    return list(result)


def set_student_token(dao: MongoDAO, exam_id: str, username: str, token: str):
    if not exam_id or not username or not token:
        raise Exception('Id, username and token required to set student token for an exam access')
    result = dao.exam_col.update_one(filter={
        '_id': ObjectId(exam_id),
        'exam_type': 'exam'
    }, update={
        '$set': {
            'students.$[elem].access_token': token
        }
    }, array_filters=[{
        'elem.username': username
    }])
    if result.modified_count == 0:
        raise Exception('Token not set.')
