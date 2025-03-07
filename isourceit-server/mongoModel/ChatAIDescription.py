from typing import TypedDict, NotRequired
import pydantic
from bson import ObjectId

__all__ = ['ChatAIDescription']


class ChatAIDescription(TypedDict):
    _id: NotRequired[ObjectId]
    chat_key: pydantic.StrictStr
    model_key: pydantic.StrictStr
    