from datetime import datetime
from typing import TypedDict, NotRequired, List, Dict, Any

import pydantic
from bson import ObjectId

__all__ = ['BaseExam']


class BaseExam(TypedDict):
    _id: NotRequired[ObjectId]
    id: NotRequired[pydantic.StrictStr]
    exam_type: NotRequired[pydantic.StrictStr]
    course_id: NotRequired[pydantic.StrictStr]
    name: pydantic.StrictStr
    description: NotRequired[pydantic.StrictStr]
    created: datetime
    owner_username: pydantic.StrictStr
    authors: List[Dict[pydantic.StrictStr, Any]]  # {username, firstname, lastname...}
    students: List[Dict[pydantic.StrictStr, Any]]  # {username, firstname, lastname...}

    student_generation_auth_url: NotRequired[str]  # {not in bd}
