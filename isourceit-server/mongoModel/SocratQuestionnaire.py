from typing import List, Dict, Any

import pydantic

from mongoModel.BaseExam import BaseExam

__all__ = ['SocratQuestionnaire']


class SocratQuestionnaire(BaseExam):
    questions: List[Dict[pydantic.StrictStr, Any]]  # {question, init_prompt}
    selected_chat: Dict[pydantic.StrictStr, Any]  # { chat_key, private_key }
