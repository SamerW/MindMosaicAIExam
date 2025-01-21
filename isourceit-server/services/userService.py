from typing import Mapping, Optional, cast
import pydantic
import werkzeug
from mongoDAO import userRepository
from mongoDAO.MongoDAO import MongoDAO
from mongoModel.User import User
from services.securityService import hash_password


def create_user(user_data: Mapping) -> User:
    mongo_dao = MongoDAO()
    user_to_create = cast(User, pydantic.create_model_from_typeddict(User)(**user_data).dict())
    user_to_create['password'] = hash_password(user_to_create['password'])
    user_id = userRepository.create_user(mongo_dao, user_to_create)
    return userRepository.find_user_by_user_id(mongo_dao, user_id)


def find_user_by_username(username: str) -> Optional[User]:
    mongo_dao = MongoDAO()
    return userRepository.find_user_by_username(mongo_dao, username)


def update_user(user_id: str, user_data: Mapping) -> User:
    mongo_dao = MongoDAO()
    user_to_update = cast(User, pydantic.create_model_from_typeddict(User)(**user_data).dict())
    if user_to_update['id'] != user_id:
        raise werkzeug.exceptions.BadRequest("Exam id mismatch between data and url")
    user_to_update['password'] = hash_password(user_to_update['password'])
    userRepository.update_user(mongo_dao, user_to_update)
    return userRepository.find_user_by_user_id(mongo_dao, user_id)


def patch_user(user_id: str, user_data: Mapping):
    if not user_id:
        raise werkzeug.exceptions.BadRequest("Missing user id")
    patch_data = {
        'firstname': user_data.get('firstname', None),
        'lastname': user_data.get('lastname', None),
        'password': hash_password(user_data['password']) if 'password' in user_data else None,
        'role': user_data.get('role', None)
    }
    mongo_dao = MongoDAO()
    userRepository.patch_user(mongo_dao, user_id, **patch_data)
    return userRepository.find_user_by_user_id(mongo_dao, user_id)


def delete_user(user_id: str) -> None:
    mongo_dao = MongoDAO()
    userRepository.delete_user(mongo_dao, user_id)