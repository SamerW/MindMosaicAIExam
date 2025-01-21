import json
import logging
from concurrent.futures import ThreadPoolExecutor
from json import JSONDecodeError
from multiprocessing.queues import Queue
from typing import Optional, Dict, List

import requests
import sseclient

from mongoDAO.MongoDAO import MongoDAO
from mongoDAO.studentActionRepository import find_last_chat_ai_model_interactions
from mongoModel.StudentAction import AskChatAI
from services.chatAI.ChatAIHandler import ChatAIHandler

__all__ = ['OpenAIHAndler']

LOG = logging.getLogger(__name__)

NAME_MODEL_DICT = {
    'gpt-4o': 'Most capable GPT model.'
}

VISION_MODELS = ["gpt-4o"]

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
DEFAULT_WORKER_POOL_SIZE = 4
OPENAI_SYSTEM_INIT_PROMPT = "You are a helpful assistant."
OPENAI_TEMPERATURE = 0.6


def generate_request_messages_from_previous_chat_interactions(chat_interactions: List,image):
    #for interaction in chat_interactions:
    for index, interaction in enumerate(chat_interactions):
        if index == len(chat_interactions) - 1:
            if interaction['achieved']:
                yield {'role': 'user',
                    'content': interaction['hidden_prompt'] if interaction.get('hidden_prompt') else interaction[
                        'prompt']}
                yield {'role': 'assistant', 'content': interaction.get('answer', '')}
            elif image is not None:
                yield {'role': 'user',
                'content': [

                    {
                    "type": "text",
                    "text": interaction['hidden_prompt'] if interaction.get('hidden_prompt') else interaction[
                    'prompt'],
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"{image}"},
                }]}
            else:
                yield {'role': 'user',
                    'content': interaction['hidden_prompt'] if interaction.get('hidden_prompt') else interaction[
                        'prompt']}
        else:
            if interaction['achieved']:
                yield {'role': 'user',
                    'content': interaction['hidden_prompt'] if interaction.get('hidden_prompt') else interaction[
                        'prompt']}
                yield {'role': 'assistant', 'content': interaction.get('answer', '')}
            else:
                yield {'role': 'user',
                    'content': interaction['hidden_prompt'] if interaction.get('hidden_prompt') else interaction[
                        'prompt']}
        
        


class OpenAIHAndler(ChatAIHandler):
    __slots__ = ['_response_queue', '_worker_pool_size', '_worker_pool']

    def __init__(self, response_queue: Queue, config: Dict = None):
        self._worker_pool: ThreadPoolExecutor = None
        self._worker_pool_size: int = -1
        self._response_queue: Queue = response_queue
        self._init_config(config)

    def _init_config(self, config: Dict = None):
        if config is not None:
            self._worker_pool_size = config.get('CHATAI_OPENAI_POOL_SIZE', DEFAULT_WORKER_POOL_SIZE)
        else:
            self._worker_pool_size = DEFAULT_WORKER_POOL_SIZE

    @property
    def chat_key(self) -> str:
        return 'OPENAI ..'

    @property
    def name(self) -> str:
        return 'OpenAI Remote AI service'

    def get_model_name(self, model_key: str) -> Optional[str]:
        return NAME_MODEL_DICT.get(model_key, model_key)

    @property
    def copy_past(self) -> bool:
        return False

    @property
    def private_key_required(self) -> bool:
        return True

    @property
    def connected(self):
        return self._worker_pool is not None

    def connect(self):
        if self.connected:
            LOG.warning('Already connect.')
            return
        self._worker_pool = ThreadPoolExecutor(max_workers=self._worker_pool_size)

    def disconnect(self):
        if self.connected:
            LOG.warning('Not connected.')
            return
        self._worker_pool.shutdown(wait=True, cancel_futures=True)
        self._worker_pool = None

    def request_available_models(self, request_identifiers: Dict = None, **kwargs):
        if not self.connected:
            LOG.warning('Cannot request available model. Not Connected.')
            return
        last_model_idx = len(NAME_MODEL_DICT) - 1
        for idx, model_key in enumerate(NAME_MODEL_DICT.keys()):
            result = dict() if request_identifiers is None else dict(request_identifiers)
            result['answer'] = model_key
            result['ended'] = True if idx < last_model_idx else False
            result['chat_key'] = self.chat_key
            self._response_queue.put(result)

    def _handle_prompt(self, action: AskChatAI, private_key: str, request_identifiers: Dict = None,
                       extra: dict = None):
        # retrieve previous exchanges (requires examId, username, questionIdx, chat_key)
        mongo_dao = MongoDAO()
        old_chat_interactions = find_last_chat_ai_model_interactions(mongo_dao, username=action['student_username'],
                                                                     exam_id=action['exam_id'],
                                                                     question_idx=action['question_idx'],
                                                                     chat_id=action['chat_id'])
        # forge request using stream mode and user tracking
        LOG.warning(old_chat_interactions)
        init_prompt = extra['custom_init_prompt'] if 'custom_init_prompt' in extra else OPENAI_SYSTEM_INIT_PROMPT
        temperature = extra['custom_temperature'] if 'custom_temperature' in extra is not None else OPENAI_TEMPERATURE
        if "image" in action:
            rq_messages = [{"role": "system", "content": init_prompt}] + list(
                    generate_request_messages_from_previous_chat_interactions(old_chat_interactions,action["image"]))
        else:
            rq_messages = [{"role": "system", "content": init_prompt}] + list(
                    generate_request_messages_from_previous_chat_interactions(old_chat_interactions,None))
        rq_body = {
            'model': action['model_key'],
            'messages': rq_messages,
            'temperature': temperature,
            'stream': True,
            'user': action['student_username']
        }
        rq_headers = {"Authorization": "Bearer {}".format(private_key),
                      "Content-Type": "application/json"}

        # send request as stream and retrieve event sequentially
        try:
            http_response = requests.post(OPENAI_CHAT_URL, data=json.dumps(rq_body), headers=rq_headers, stream=True)
            http_response.raise_for_status()
        except requests.exceptions.Timeout as e:
            LOG.warning('timeout exception: {}'.format(repr(e)))
        except requests.exceptions.ConnectionError as e:
            LOG.warning('Connection exception: {}'.format(repr(e)))
        except requests.exceptions.HTTPError as e:
            LOG.warning('HTTPError: {}'.format(repr(e)))
        except requests.exceptions.RequestException as e:
            LOG.warning('Other request error: {}'.format(repr(e)))
        else:
            client = sseclient.SSEClient(http_response)
            for event in client.events():
                if event.data == '[DONE]':
                    # end marker received. stop here
                    break
                # parse json data
                try:
                    ev_data = json.loads(event.data)
                except JSONDecodeError as e:
                    LOG.warning("Got json decode error: {}".format(repr(e)))
                    break
                else:
                    # process finish_reason (for logging)
                    finish_reason = ev_data['choices'][0]["finish_reason"]
                    if finish_reason == 'content_filter':
                        LOG.warning("Got OpenAI answer with content_filter marker: Omitted content due to a flag from "
                                    "OpenAI content filters. User {}".format(action['student_username']))
                    elif finish_reason == 'length':
                        LOG.warning("Got OpenAI answer with length marker: Incomplete model output due to max_tokens "
                                    "parameter or token limit. User {}".format(action['student_username']))
                    # process answer delta
                    delta = ev_data['choices'][0]['delta']
                    # if role received, check it for logging and do nothing else
                    if 'role' in delta:
                        if delta['role'] != 'assistant':
                            LOG.warning("Got OpenAI answer with bad role: {}".format(delta['role']))
                        continue
                    # if content received, set it as the answer of the result and send the result to the queue
                    if 'content' in delta:
                        # prepare a response
                        result = dict()
                        if request_identifiers is not None:
                            result.update(request_identifiers)
                        result['answer'] = delta['content']
                        result['ended'] = False
                        result['chat_key'] = self.chat_key
                        result['model_key'] = action['model_key']
                        self._response_queue.put(result)
            # send a last response to mark the end
            result = dict()
            if request_identifiers is not None:
                result.update(request_identifiers)
            result['ended'] = True
            result['chat_key'] = self.chat_key
            result['model_key'] = action['model_key']
            self._response_queue.put(result)

    def send_prompt(self, model: str, prompt: str, request_identifiers: Dict = None, **kwargs):
        if not self.connected:
            LOG.warning('Cannot request available model. Not Connected.')
            return
        private_key: str = kwargs.get('private_key')
        if not private_key:
            LOG.warning('Cannot request OpenAI without any private key.')
            return
        action: AskChatAI = kwargs.get('action')
        if not action:
            LOG.warning('Cannot request OpenAI without any action.')
            return
        extra_keys = ('custom_init_prompt', 'custom_temperature')
        extra = dict((k, kwargs[k]) for k in extra_keys if k in kwargs and kwargs[k])

        # Request thread pools of openai worker to
        self._worker_pool.submit(self._handle_prompt, action, private_key, request_identifiers, extra)
