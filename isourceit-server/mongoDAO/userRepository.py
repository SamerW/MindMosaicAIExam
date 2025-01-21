from typing import Any, Optional
from bson import ObjectId
from mongoDAO.MongoDAO import MongoDAO
from mongoModel.User import User


__all__ = ['create_user', 'update_user']


def create_user(dao: MongoDAO, user: User) -> Any:
    if not user:
        raise Exception('User required to create user')
    del user['id']
    result = dao.user_col.insert_one(user)
    return result.inserted_id


def update_user(dao: MongoDAO, user: User) -> None:
    if not user:
        raise Exception('User required to update user')
    if not user['id']:
        raise Exception('User Id required to update user')
    result = dao.user_col.update_one({'_id': ObjectId(user['id'])}, {
        '$set': {
            'firstname': user['firstname'],
            'lastname': user['lastname'],
            'password': user['password'],
            'role': user['role']
        }
    })
    if result.matched_count == 0:
        raise Exception('User Id not found.')


def patch_user(dao: MongoDAO, user_id: str, firstname: str = None, lastname: str = None, password: str = None,
               role: str = None) -> None:
    if not user_id:
        raise Exception('User id required to patch user')
    set_dict = dict()
    if firstname is not None:
        set_dict['firstname'] = firstname
    if lastname is not None:
        set_dict['lastname'] = lastname
    if password is not None:
        set_dict['password'] = password
    if role is not None:
        set_dict['role'] = role
    result = dao.user_col.update_one({'_id': ObjectId(user_id)}, {'$set': set_dict})
    if result.matched_count == 0:
        raise Exception('User Id not found.')


def find_user_by_user_id(dao: MongoDAO, user_id: str, with_password: bool = False) -> Optional[User]:
    if not user_id:
        raise Exception('User id required to find user')
    user_data = dao.user_col.find_one(ObjectId(user_id))
    if user_data:
        user_data['id'] = str(user_data['_id'])
        del user_data['_id']
        if not with_password:
            del user_data['password']
        return User(**user_data)
    else:
        return None


def find_user_by_username(dao: MongoDAO, username: str, with_password: bool = False) -> Optional[User]:
    if not username:
        raise Exception('Username required to find user')
    user_data = dao.user_col.find_one({'username': username})
    if user_data:
        user_data['id'] = str(user_data['_id'])
        del user_data['_id']
        if not with_password:
            del user_data['password']
        return User(**user_data)
    else:
        return None


def delete_user(dao: MongoDAO, user_id: str) -> None:
    if not user_id:
        raise Exception('User id required to delete user')
    result = dao.user_col.delete_one({'_id': ObjectId(user_id)})
    if result.deleted_count == 0:
        raise Exception('No user deleted')
