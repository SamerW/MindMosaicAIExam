from typing import List

from mongoDAO.MongoDAO import MongoDAO
from mongoModel.ChatAIDescription import ChatAIDescription

__all__ = ['clear_chatai_descriptions', 'add_chatai_description', 'find_all_chatai_descriptions']


def clear_chatai_descriptions(dao: MongoDAO) -> None:
    dao.chatai_desc_col.delete_many({})


def add_chatai_description(dao: MongoDAO, description: ChatAIDescription) -> None:
    dao.chatai_desc_col.insert_one(description)


def find_all_chatai_descriptions(dao: MongoDAO) -> List[ChatAIDescription]:
    return list(dao.chatai_desc_col.find({}))
