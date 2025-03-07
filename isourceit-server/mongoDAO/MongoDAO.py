import logging
from typing import Dict

import pymongo
from gridfs import GridFS
from pymongo import MongoClient, database
from pymongo.collection import Collection
from pymongo.database import Database

from mongoModel.ChatAIDescription import ChatAIDescription
from mongoModel.SearchEngineDescription import SearchEngineDescription

from mongoModel.Exam import Exam
from mongoModel.ReportArchive import ReportArchive
from mongoModel.SocratQuestionnaire import SocratQuestionnaire
from mongoModel.StudentAction import StudentAction
from mongoModel.User import User
from utils.Singleton import Singleton

__all__ = ['MongoDAO']

DEFAULT_GP_EXAM_DB = 'gtp-exam-db'
EXAM_COL = 'exams'
STUDENT_ACTION_COL = 'studentActions'
USER_COL = 'users'
CHAT_AI_DESC_COL = 'chatAIDescriptions'
SESSION_COL = 'flaskSessions'
REPORT_ARCHIVE_COL = 'reportArchives'
SEARCH_ENGINE_DESC_COL = 'searchEngineDescriptions'

LOG = logging.getLogger(__name__)


class MongoDAO(metaclass=Singleton):
    __slots__ = ['__configuration', '__connection', '__database_name', '__db', '__grid_fs']

    def __init__(self, configuration: Dict = None):
        self.__configuration: Dict = configuration
        self.__connection: MongoClient = None
        self.__database_name: str = None
        self.__db: database = None
        self.__grid_fs: GridFS = None

    @property
    def configuration(self) -> Dict:
        return self.__configuration

    @property
    def client(self) -> MongoClient:
        return self.__connection

    @property
    def database_name(self) -> str:
        return self.__database_name

    @property
    def database(self) -> Database:
        return self.__db

    @property
    def exam_col(self) -> Collection[Exam]:
        if self.__db is None:
            raise Exception('No available database')
        return self.__db[EXAM_COL]

    @property
    def socrat_col(self) -> Collection[SocratQuestionnaire]:
        if self.__db is None:
            raise Exception('No available database')
        return self.__db[EXAM_COL]

    @property
    def student_action_col(self) -> Collection[StudentAction]:
        if self.__db is None:
            raise Exception('No available database')
        return self.__db[STUDENT_ACTION_COL]

    @property
    def user_col(self) -> Collection[User]:
        if self.__db is None:
            raise Exception('No available database')
        return self.__db[USER_COL]

    @property
    def chatai_desc_col(self) -> Collection[ChatAIDescription]:
        if self.__db is None:
            raise Exception('No available database')
        return self.__db[CHAT_AI_DESC_COL]
    
    @property
    def searchengine_desc_col(self) -> Collection[SearchEngineDescription]:
        if self.__db is None:
            raise Exception('No available database')
        return self.__db[SEARCH_ENGINE_DESC_COL]

    @property
    def report_archive_col(self) -> Collection[ReportArchive]:
        if self.__db is None:
            raise Exception('No available database')
        return self.__db[REPORT_ARCHIVE_COL]

    @property
    def session_col(self) -> Collection:
        if self.__db is None:
            raise Exception('No available database')
        return self.__db[SESSION_COL]

    @property
    def grid_fs(self) -> GridFS:
        if self.__db is None:
            raise Exception('No available database')
        return self.__grid_fs

    @property
    def is_opened(self) -> bool:
        return self.__connection is not None

    def open(self) -> None:
        host = self.__configuration.get('host', 'localhost')
        if 'port' in self.__configuration:
            host = "%s:%d" % (host, self.__configuration.get('port'))
        extra_params = dict()
        if 'credentials' in self.__configuration:
            creds = self.__configuration['credentials']
            if 'username' in creds:
                extra_params['username'] = creds['username']
                if 'password' in creds:
                    extra_params['password'] = creds['password']
                if 'authSource' in creds:
                    extra_params['authSource'] = creds['authSource']
                if 'authMechanism' in creds:
                    extra_params['authMechanism'] = creds['authMechanism']
        self.__database_name = self.__configuration.get('database', DEFAULT_GP_EXAM_DB)
        self.__connection = MongoClient(host, **extra_params, connect=False)
        self.__db = self.__connection[self.__database_name]
        LOG.debug("Mongo connection opened to db %s", self.__database_name)
        self.__grid_fs = GridFS(self.__db)

    def close(self) -> None:
        if self.__connection is not None:
            self.__connection.close()
            self.__connection = None

    def init_indexes(self) -> None:
        if not self.is_opened:
            raise Exception('Cannot init indexes without any opened connection to Mongo')
        self.student_action_col.create_index('student_username')
        self.student_action_col.create_index([('student_username', pymongo.ASCENDING), ('exam_id', pymongo.ASCENDING)])
        self.user_col.create_index('username', unique=True)
        self.report_archive_col.create_index('exam_id', unique=True)

    @staticmethod
    def compute_dao_options_from_app(app_config: Dict):
        option_dict = dict(host=app_config.get('MONGO_HOST', 'localhost'), port=app_config.get('MONGO_PORT', 27017),
                           database=app_config.get('MONGO_DATABASE', 'demo'))
        username = app_config.get('MONGO_USERNAME')
        password = app_config.get('MONGO_PASSWORD')
        if username and password:
            cred_dict = dict(username=username, password=password)
            auth_source = app_config.get('MONGO_AUTH_SOURCE')
            if auth_source:
                cred_dict['authSource'] = auth_source
            option_dict['credentials'] = cred_dict
        return option_dict

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            self.close()
        except Exception as e:
            LOG.warning("Exception while closing Mongo connection: " + str(e))
