from abc import ABCMeta, abstractmethod

__all__ = ['ChatAIHandler']

from typing import Optional, Dict


class ChatAIHandler(metaclass=ABCMeta):

    @property
    @abstractmethod
    def chat_key(self) -> str:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def get_model_name(self, model_key: str) -> Optional[str]:
        pass

    @property
    @abstractmethod
    def copy_past(self) -> bool:
        pass

    @property
    @abstractmethod
    def private_key_required(self) -> bool:
        pass

    @property
    @abstractmethod
    def connected(self):
        pass

    @abstractmethod
    def connect(self):
        pass

    @abstractmethod
    def disconnect(self):
        pass

    @abstractmethod
    def request_available_models(self, request_identifiers: Dict = None, **kwargs):
        pass

    @abstractmethod
    def send_prompt(self, model: str, prompt: str, request_identifiers: Dict = None, **kwargs):
        pass
