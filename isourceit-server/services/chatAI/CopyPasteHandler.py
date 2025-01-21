import logging
from queue import Queue
from typing import Optional, Dict

from services.chatAI.ChatAIHandler import ChatAIHandler

__all__ = ['CopyPasteHandler']

LOG = logging.getLogger(__name__)


COPYPASTE_MODEL = 'DFLT'


class CopyPasteHandler(ChatAIHandler):
    __slots__ = ['_response_queue', '_connected']

    def __init__(self, response_queue: Queue):
        self._response_queue = response_queue
        self._connected = False

    @property
    def chat_key(self):
        return 'COPYPASTE'

    @property
    def name(self) -> str:
        return 'Simple Prompt-answer Copy/Past service'

    def get_model_name(self, model_key: str) -> Optional[str]:
        return None

    @property
    def copy_past(self) -> bool:
        return True

    @property
    def private_key_required(self) -> bool:
        return False

    @property
    def connected(self):
        return self._connected

    def connect(self):
        self._connected = True

    def disconnect(self):
        self._connected = False

    def request_available_models(self, request_identifiers: Dict = None, **kwargs):
        if not self.connected:
            LOG.warning('Cannot request available model. Not Connected.')
            return
        result = dict() if request_identifiers is None else dict(request_identifiers)
        result['answer'] = COPYPASTE_MODEL
        result['ended'] = True
        result['chat_key'] = self.chat_key
        self._response_queue.put(result)

    def send_prompt(self, model: str, prompt: str, request_identifiers: Dict = None, **kwargs):
        if not self.connected:
            LOG.warning('Cannot request available model. Not Connected.')
            return
        if model != COPYPASTE_MODEL:
            return
        result = dict() if request_identifiers is None else dict(request_identifiers)
        result['ended'] = True
        # result['answer'] = kwargs.get('answer') avoid sur-setting answer in db
        # inject chat key and mode key
        result['chat_key'] = self.chat_key
        result['model_key'] = COPYPASTE_MODEL
        self._response_queue.put(result)
