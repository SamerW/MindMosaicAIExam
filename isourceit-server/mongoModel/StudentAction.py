from datetime import datetime
from typing import TypedDict, NotRequired, Optional

import pydantic
from bson import ObjectId

__all__ = ['StudentAction', 'StartExam', 'START_EXAM_TYPE',
           'WroteInitialAnswer', 'WROTE_INITIAL_ANSWER_TYPE',
           'AskChatAI', 'ASK_CHAT_AI_TYPE',
           'ExternalResource', 'EXTERNAL_RESOURCE_TYPE',
           'WroteFinalAnswer', 'WROTE_FINAL_ANSWER_TYPE',
           'SubmitExam', 'SUBMIT_EXAM_TYPE',
           'ChangedQuestion', 'CHANGED_QUESTION_TYPE',
           'LOST_FOCUS_TYPE', 'LostFocus',
           'STUDENT_ACTION_TYPE_MAPPING', 'create_start_exam']

START_EXAM_TYPE = 'StartExam'
CHANGED_QUESTION_TYPE = 'ChangedQuestion'
LOST_FOCUS_TYPE = 'LostFocus'
WROTE_INITIAL_ANSWER_TYPE = 'WriteInitialAnswer'
ASK_CHAT_AI_TYPE = 'AskChatAI'
EXTERNAL_RESOURCE_TYPE = 'AddExternalResource'
WROTE_FINAL_ANSWER_TYPE = 'WriteFinalAnswer'
SUBMIT_EXAM_TYPE = 'SubmitExam'
# Define the new action type constant






class StudentAction(TypedDict):
    _id: NotRequired[ObjectId]
    id: NotRequired[pydantic.StrictStr]
    timestamp: datetime
    exam_id: pydantic.StrictStr
    question_idx: NotRequired[pydantic.StrictInt]
    student_username: pydantic.StrictStr
    action_type: pydantic.StrictStr


class StartExam(StudentAction):
    pass


class ChangedQuestion(StudentAction):
    next_question_idx: NotRequired[pydantic.StrictInt]


class LostFocus(StudentAction):
    return_timestamp: datetime
    duration_seconds: pydantic.StrictInt
    page_hidden: pydantic.StrictBool


class WroteInitialAnswer(StudentAction):
    text: pydantic.StrictStr


class AskChatAI(StudentAction):
    prompt: NotRequired[pydantic.StrictStr]
    hidden_prompt: NotRequired[pydantic.StrictStr]
    answer: NotRequired[pydantic.StrictStr]
    achieved: NotRequired[pydantic.StrictBool]
    chat_id: pydantic.StrictStr
    chat_key: pydantic.StrictStr
    model_key: pydantic.StrictStr
    image: NotRequired[pydantic.StrictStr]


class ExternalResource(StudentAction):
    title: pydantic.StrictStr
    description: pydantic.StrictStr
    rsc_type: NotRequired[pydantic.StrictStr]
    removed: NotRequired[datetime]


class WroteFinalAnswer(StudentAction):
    text: pydantic.StrictStr


class SubmitExam(StudentAction):
    pass






STUDENT_ACTION_TYPE_MAPPING = {
    START_EXAM_TYPE: StartExam,
    CHANGED_QUESTION_TYPE: ChangedQuestion,
    LOST_FOCUS_TYPE: LostFocus,
    WROTE_INITIAL_ANSWER_TYPE: WroteInitialAnswer,
    ASK_CHAT_AI_TYPE: AskChatAI,
    EXTERNAL_RESOURCE_TYPE: ExternalResource,
    WROTE_FINAL_ANSWER_TYPE: WroteFinalAnswer,
    SUBMIT_EXAM_TYPE: SubmitExam
}




def create_start_exam(exam_id: str, student_username: str, timestamp: datetime = None):
    return StartExam(timestamp=timestamp if timestamp else datetime.now(), exam_id=exam_id,
                     student_username=student_username, action_type=START_EXAM_TYPE)


def create_wrote_initial_answer(exam_id: str, question_idx: int, student_username: str,
                                text: str,
                                timestamp: datetime = None):
    return WroteInitialAnswer(timestamp=timestamp if timestamp else datetime.now(), exam_id=exam_id,
                              question_idx=question_idx, student_username=student_username,
                              action_type=WROTE_INITIAL_ANSWER_TYPE, text=text)


def create_ask_chat_ai(exam_id: str, question_idx: int, student_username: str,
                       prompt: str, answer: Optional[str], chat_id: str,
                       chat_key: str, model_key: str,
                       timestamp: datetime = None):
    return AskChatAI(timestamp=timestamp if timestamp else datetime.now(), exam_id=exam_id,
                     question_idx=question_idx, student_username=student_username,
                     action_type=ASK_CHAT_AI_TYPE, prompt=prompt, answer=answer, chat_id=chat_id, chat_key=chat_key,
                     model_key=model_key)


def create_external_resource(exam_id: str, question_idx: int, student_username: str,
                             title: str, description: str, rsc_type: str, removed: Optional[datetime],
                             timestamp: datetime = None):
    return ExternalResource(timestamp=timestamp if timestamp else datetime.now(), exam_id=exam_id,
                            question_idx=question_idx, student_username=student_username,
                            action_type=EXTERNAL_RESOURCE_TYPE, title=title, description=description, rsc_type=rsc_type,
                            removed=removed)


def create_wrote_final_answer(exam_id: str, question_idx: int, student_username: str,
                              text: str,
                              timestamp: datetime = None):
    return WroteFinalAnswer(timestamp=timestamp if timestamp else datetime.now(), exam_id=exam_id,
                            question_idx=question_idx, student_username=student_username,
                            action_type=WROTE_FINAL_ANSWER_TYPE, text=text)


def create_submit_exam(exam_id: str, student_username: str, timestamp: datetime = None):
    return SubmitExam(timestamp=timestamp if timestamp else datetime.now(), exam_id=exam_id,
                      student_username=student_username, action_type=SUBMIT_EXAM_TYPE)
