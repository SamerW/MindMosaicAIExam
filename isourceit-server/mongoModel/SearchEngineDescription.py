from typing import TypedDict, NotRequired
import pydantic
from bson import ObjectId

__all__ = ['SearchEngineDescription']


class SearchEngineDescription(TypedDict):
    _id: NotRequired[ObjectId]
    search_engine_name: pydantic.StrictStr
    api_key: pydantic.StrictStr
    
