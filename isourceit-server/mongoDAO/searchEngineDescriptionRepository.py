from typing import List

from mongoDAO.MongoDAO import MongoDAO
from mongoModel.SearchEngineDescription import SearchEngineDescription

__all__ = ['clear_search_engine_descriptions', 'add_search_engine_description', 'find_all_search_engine_descriptions']


def clear_search_engine_descriptions(dao: MongoDAO) -> None:
    dao.chatai_desc_col.delete_many({})


def add_search_engine_description(dao: MongoDAO, description: SearchEngineDescription) -> None:
    dao.searchengine_desc_col.insert_one(description)


def find_all_search_engine_descriptions(dao: MongoDAO) -> List[SearchEngineDescription]:
    return list(dao.searchengine_desc_col.find({}))
