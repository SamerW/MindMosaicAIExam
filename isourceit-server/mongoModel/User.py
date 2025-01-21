from typing import TypedDict, NotRequired
import pydantic
from bson import ObjectId

__all__ = ['User']


class User(TypedDict):
    _id: NotRequired[ObjectId]
    id: NotRequired[pydantic.StrictStr]
    username: pydantic.StrictStr
    firstname: pydantic.StrictStr
    lastname: pydantic.StrictStr
    password: pydantic.StrictStr
    role: pydantic.StrictStr
