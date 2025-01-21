from datetime import datetime
from typing import TypedDict, NotRequired
import pydantic
from bson import ObjectId

__all__ = ['ReportArchive']


class ReportArchive(TypedDict):
    _id: NotRequired[ObjectId]
    exam_id: pydantic.StrictStr
    state: pydantic.StrictStr  # pending, ready, error
    progression: pydantic.StrictInt  # [0; 100] % progression
    creation_date: datetime  # create date of document
    ready_date: NotRequired[datetime]  # date when the archive is ready of the teacher
    archive_id:  NotRequired[pydantic.StrictStr]  # id of the mongo grid file
