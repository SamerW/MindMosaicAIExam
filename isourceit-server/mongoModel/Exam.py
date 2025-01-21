from typing import NotRequired, List, Dict, Any

import pydantic

from mongoModel.BaseExam import BaseExam

__all__ = ['Exam']


class Exam(BaseExam):
    questions: List[Dict[pydantic.StrictStr, pydantic.StrictStr]]
    duration_minutes: pydantic.StrictInt
    selected_chats: NotRequired[Dict[pydantic.StrictStr, Any]]  # { chat_key, private_key }
