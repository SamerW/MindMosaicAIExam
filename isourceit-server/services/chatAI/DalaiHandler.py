import logging
from multiprocessing.queues import Queue
from typing import Dict, Optional
import socketio
from services.chatAI.ChatAIHandler import ChatAIHandler

__all__ = ['DalaiHandler']

LOG = logging.getLogger(__name__)


NAME_MODEL_DICT = {
    'alpaca.7B': 'Alpaca model, 7 billions parameters',
    'llama.7B': 'LLaMa model, 7 billions parameters',
    'llama.13B': 'LLaMa model, 13 billions parameters',
    'llama.30B': 'LLaMa model, 30 billions parameters',
    'llama.65B': 'LLaMa model, 65 billions parameters',
}


class DalaiHandler(ChatAIHandler):
    __slots__ = ['_sio', '_dalai_url', '_models', '_response_queue']

    def __init__(self, response_queue: Queue, config: Dict = None, auto_reconnect: bool = True, debug: bool = False):
        self._sio: socketio.Client = socketio.Client(reconnection=auto_reconnect, reconnection_delay=5,
                                                     logger=debug, engineio_logger=debug)
        self._init_config(config)
        self._init_socket_io()
        self._models = set()
        self._response_queue = response_queue

    def _init_config(self, config: Dict = None):
        if config is not None:
            self._dalai_url = config.get('CHATAI_DALAI_URL', 'http://localhost:5001')
        else:
            self._dalai_url = 'http://localhost:5001'

    def _init_socket_io(self):
        self._sio.on('connect', self._on_connect)
        self._sio.on('connect_error', self._on_connect_error)
        self._sio.on('disconnect', self._on_disconnect)
        self._sio.on('result', self._on_result)
        self._sio.on('*', self._on_catch_all)

    @property
    def chat_key(self) -> str:
        return 'DALAI'

    @property
    def name(self) -> str:
        return 'Dalai local AI service'

    def get_model_name(self, model_key: str) -> Optional[str]:
        return NAME_MODEL_DICT.get(model_key, model_key)

    @property
    def copy_past(self) -> bool:
        return False

    @property
    def private_key_required(self) -> bool:
        return False

    @property
    def connected(self):
        return self._sio.connected

    @property
    def models(self):
        return self._models

    def connect(self):
        self._sio.connect(self._dalai_url)

    def disconnect(self):
        self._sio.disconnect()

    def request_available_models(self, request_identifiers: Dict = None, **kwargs):
        if not self.connected:
            LOG.warning('Cannot request available model. Not Connected.')
            return
        self._models.clear()
        request = {
            'method': 'installed',
            'request_identifiers': request_identifiers
        }
        self._sio.emit('request', request)

    def send_prompt(self, model: str, prompt: str, request_identifiers: Dict = None, **kwargs):
        if not self.connected:
            LOG.warning('Cannot request available model. Not Connected.')
            return
        request = {
            'model': model,  # 'alpaca.7B',
            'prompt': prompt,
            'request_identifiers': request_identifiers,
        }
        """
        seed: -1
        threads: 8
        n_predict: 128, (The number of tokens to return (The default is 128 if unspecified))
        top_k ?
        top_p ?
        batch_size
        repeat_last_n
        repeat_penalty
        interactive
        temp: "Temperature"
        skip_end: false
        
        full
        debug
        html
        """
        self._sio.emit('request', request)

    def _on_connect(self):
        LOG.debug("Connected to Dalai")

    def _on_connect_error(self, data):
        LOG.warning("The connection to Dalai failed!")
        #print(data)

    def _on_disconnect(self):
        LOG.debug("Disconnected from Dalai")

    def _on_catch_all(self, event, data):
        LOG.debug("Received unmanaged event: ", event)

    def _on_result(self, data):
        # Retrieve request and
        request = data.get('request', None)
        if request is None:
            LOG.warning("Receive result data without request")
            return
        # Retrieve answer
        answer = data.get('response', None)
        if answer is None:
            LOG.warning("Receive result data without answer")
            return

        result = dict()

        # inject extra params if any
        request_identifiers = request.get('request_identifiers', None)
        if request_identifiers is not None:
            result.update(request_identifiers)

        # if answer is end marker, pop the callback for a last call
        if answer == '\n\n<end>':
            result['ended'] = True
        else:
            result['ended'] = False
            result['answer'] = answer

        # inject chat key and model key if any
        result['chat_key'] = self.chat_key
        if 'model' in request:
            result['model_key'] = request['model']

        self._response_queue.put(result)

