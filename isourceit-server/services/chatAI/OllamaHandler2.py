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
import socket

__all__ = ['OllamaHAndler2']

LOG = logging.getLogger(__name__)

NAME_MODEL_DICT = {
    'mistral': 'Most capable model.'
}

VISION_MODELS = ["llama3.2-vision","llama3.2-vision:90b"]


DEFAULT_WORKER_POOL_SIZE = 4
OLLAMA_SYSTEM_INIT_PROMPT = "You are a helpful assistant."
OLLAMA_TEMPERATURE = 0.6
OLLAMA_IP = "http://host.docker.internal:11434"
def get_active_interface_ip():
    try:
        # Connect to an external IP (it doesn't matter which)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        OLLAMA_IP = local_ip
        LOG.info("OLLAMA_IP")
        LOG.info(OLLAMA_IP)
        s.close()
        return local_ip
    except Exception as e:
        print(f"Error obtaining active interface IP: {e}")
        return None


def generate_request_messages_from_previous_chat_interactions(chat_interactions: List):
    for interaction in chat_interactions:
        if interaction['achieved']:
            yield {'role': 'user',
                   'content': interaction['hidden_prompt'] if interaction.get('hidden_prompt') else interaction[
                       'prompt']}
            yield {'role': 'assistant', 'content': interaction.get('answer', '')}
        else:
            yield {'role': 'user',
                   'content': interaction['hidden_prompt'] if interaction.get('hidden_prompt') else interaction[
                       'prompt']}




class OllamaHandler2(ChatAIHandler):
    __slots__ = ['_response_queue', '_worker_pool_size', '_worker_pool']

    def __init__(self, response_queue: Queue, config: Dict = None):
        self._worker_pool: ThreadPoolExecutor = None
        self._worker_pool_size: int = -1
        self._response_queue: Queue = response_queue
        self._init_config(config)
        self._url : str = OLLAMA_IP
    
    def _get_ip_address(self) -> str:
        # Function to get the IP address
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))  # Google's public DNS server
            return s.getsockname()[0]

    def _init_config(self, config: Dict = None):
        if config is not None:
            self._worker_pool_size = config.get('CHATAI_OPENAI_POOL_SIZE', DEFAULT_WORKER_POOL_SIZE)
        else:
            self._worker_pool_size = DEFAULT_WORKER_POOL_SIZE

    @property
    def chat_key(self) -> str:
        return 'OLLAMA'

    @property
    def name(self) -> str:
        return 'Ollama Remote AI service'

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
        # Define the API endpoint
        url = self._url+"/api/tags"
        LOG.info("self._url")
        LOG.info(self._url)
        if not self.connected:
            LOG.warning('Cannot request available model. Not Connected.')
            return
        try:
            # Send the GET request
            response = requests.get(url)
            response.raise_for_status()  # Raise an error for HTTP codes 4xx/5xx
            # Parse the JSON response
            models = response.json()
            for model in models["models"]:
                result = dict() if request_identifiers is None else dict(request_identifiers)
                result['answer'] = model["name"]
                result['ended'] = True
                result['chat_key'] = self.chat_key
                self._response_queue.put(result)
        except requests.exceptions.RequestException as e:
            LOG.info(f"Error fetching models: {e}")

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

        init_prompt = extra['custom_init_prompt'] if 'custom_init_prompt' in extra else OLLAMA_SYSTEM_INIT_PROMPT

        temperature = extra['custom_temperature'] if 'custom_temperature' in extra is not None else OLLAMA_TEMPERATURE
        rq_messages = [{"role": "system", "content": init_prompt}] + list(
                    generate_request_messages_from_previous_chat_interactions(old_chat_interactions))
        if "image" in action:
            if action["model_key"] in VISION_MODELS:
                rq_body = {
                            'model': action['model_key'],
                            'messages': rq_messages,
                            'temperature': temperature,
                            'stream': True,
                            'user': action['student_username'],
                            'images': action["image"]
                        }
            else:
                rq_body = {
                            'model': action['model_key'],
                            'messages': rq_messages,
                            'temperature': temperature,
                            'stream': True,
                            'user': action['student_username']
                        }
        else:
            rq_body = {
                            'model': action['model_key'],
                            'messages': rq_messages,
                            'temperature': temperature,
                            'stream': True,
                            'user': action['student_username']
                        }
        rq_headers = {
                      "Content-Type": "application/json"}

        # send request as stream and retrieve event sequentially
        url1 = self._url+"/api/chat"
        LOG.info("_handle_prompt")
        LOG.info(url1)
        try:
            #http_response = requests.post(url1, data=json.dumps(rq_body), headers=rq_headers, stream=True)
            http_response = requests.post(
                                url1,
                                json={"model": action['model_key'], "messages": rq_messages, "stream": True},
                            stream=True
                            )
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
            try:
                for line in http_response.iter_lines(decode_unicode=True):
                    if line:  # Skip empty lines
                        try:
                            event = json.loads(line)
                            LOG.warning(f"Event data: {event}")

                            # Extract data from the parsed event
                            if event.get('done'):
                                LOG.warning("Stream marked as done. Ending processing.")
                                break

                            message = event.get('message', {})
                            role = message.get('role', 'unknown')
                            content = message.get('content', '')

                            LOG.warning(f"Role: {role}, Content: {content}")

                            if len(content)>0 :
                                # prepare a response
                                result = dict()
                                if request_identifiers is not None:
                                    result.update(request_identifiers)
                                result['answer'] = content
                                result['ended'] = False
                                result['chat_key'] = self.chat_key
                                result['model_key'] = action['model_key']
                                self._response_queue.put(result)

                        except json.JSONDecodeError as e:
                            LOG.error(f"JSON decode error: {e}")
            except Exception as e:
                LOG.error(f"Error processing stream: {e}")
            finally:
                LOG.warning("Streaming response processing complete.")
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
        action: AskChatAI = kwargs.get('action')
        if not action:
            LOG.warning('Cannot request OpenAI without any action.')
            return
        extra_keys = ('custom_init_prompt', 'custom_temperature')
        extra = dict((k, kwargs[k]) for k in extra_keys if k in kwargs and kwargs[k])

        # Request thread pools of openai worker to
        LOG.warning("senf worker pool")
        self._worker_pool.submit(self._handle_prompt, action, private_key, request_identifiers, extra)
