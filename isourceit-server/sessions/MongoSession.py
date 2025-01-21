import pickle
from pickle import PickleError
from typing import Optional, Union
from bson import ObjectId
from flask import Flask, Request, Response
from flask.sessions import SessionMixin, SessionInterface
from itsdangerous import Signer, BadSignature, want_bytes
from pymongo.collection import Collection
from werkzeug.datastructures import CallbackDict
from datetime import datetime, timedelta
from flask import current_app


class MongoSession(CallbackDict, SessionMixin):
    """
    CallbackDict: each time something is changed, self.modified set to true
    """
    def __init__(self, initial=None, sid=None, permanent: bool = None):
        """

        :param initial: initial data
        :param sid: the id of the session
        :param permanent: if permanent an expiration date will be set
        """
        def on_update(self):
            self.modified = True
        CallbackDict.__init__(self, initial, on_update)
        self.sid = sid
        if permanent:
            self.permanent = bool(permanent)
        self.modified = False


class MongoSessionInterface(SessionInterface):
    __signer_salt = 'A super salt from France'
    __signer_key_derivation = 'hmac'

    def __init__(self, mongo_collection: Collection, permanent: bool = True,
                 session_prefix: str = None):
        self._mongo_col = mongo_collection
        self._permanent = permanent
        self._session_prefix = session_prefix

    def _unsign_sid(self, app: Flask, sid: str = None) -> Optional[str]:
        if sid is None:
            return None
        secret_key = app.config.get('SECRET_KEY')
        if not secret_key:
            return sid
        signer = Signer(secret_key, salt=self.__signer_salt,
                        key_derivation=self.__signer_key_derivation)
        try:
            sid_as_bytes = signer.unsign(sid)
            return sid_as_bytes.decode()
        except BadSignature as e:
            current_app.logger.warning("Bad signature: %s.", str(e))
            return None

    def _sign_sid(self, app: Flask, sid: str = None) -> Optional[Union[str|bytes]]:
        if sid is None:
            return None
        secret_key = app.config.get('SECRET_KEY')
        if not secret_key:
            return sid
        else:
            signer = Signer(secret_key, salt=self.__signer_salt,
                            key_derivation=self.__signer_key_derivation)
            return signer.sign(want_bytes(sid))

    def _remove_sid_prefix(self, sid: str = None) -> Optional[str]:
        if sid is None:
            return None
        if self._session_prefix:
            return sid[len(self._session_prefix):]
        else:
            return sid

    def _add_sid_prefix(self, sid: str = None) -> Optional[str]:
        if sid is None:
            return None
        if self._session_prefix:
            return self._session_prefix + sid
        else:
            return sid

    @staticmethod
    def _unserialize_session_data(data):
        if data is None:
            return None
        return pickle.loads(want_bytes(data))

    @staticmethod
    def _serialize_session_data(data):
        if data is None:
            return None
        return pickle.dumps(data)

    def open_session(
            self, app: Flask, request: Request
    ) -> Optional[SessionMixin]:
        # Extract sid from cookie.
        # If sid not present : create MongoSession()
        # If sid present
        #   if app has signer : decode the sid (if error, create MongoSession())
        #   Remove prefix of sid if present to extract the docId
        #   Attempt to find the doc from mongo (if not present, create MongoSession())
        #       if document expired : remove it and create MongoSession()
        #       unserialized docment data create MongoSession(data, sid=generate sid from document._id)

        # Get session cookie value, decode sid, remove prefix, if required for all cases
        doc_id = self._remove_sid_prefix(
            self._unsign_sid(app, request.cookies.get(app.config.get('SESSION_COOKIE_NAME'))))
        # if sid, retrieve the document from mongo
        if doc_id:
            document = self._mongo_col.find_one({'_id': ObjectId(doc_id)})
            if document:
                # remove doc if session expired
                expiration = document.get('expiration')
                if expiration is not None and expiration <= datetime.utcnow():
                    self._mongo_col.delete_one({'_id': ObjectId(doc_id)})
                    document = None
            if document:
                # document retrieved and session not expired : unser session data
                try:
                    session_data = self._unserialize_session_data(document.get('data'))
                    # permanent marker is included in session_data, no need to add it
                    return MongoSession(session_data, sid=doc_id)
                except PickleError as e:
                    current_app.logger.warning("Open session: got error while unserializing data: %s.", str(e))
                    pass
        # In any other case, return a new fresh session
        return MongoSession(permanent=self._permanent)

    def save_session(
            self, app: Flask, session: MongoSession, response: Response
    ) -> None:
        # get cookie information: cookie name, domain, path (required to delete it)
        cookie_name = self.get_cookie_name(app)
        cookie_domain = self.get_cookie_domain(app)
        cookie_path = self.get_cookie_path(app)

        # if session is empty (not session => not attribte, and not permanent) and modified
        # remove session, delete cookie and stop here
        if not session and session.modified:
            if session.sid is not None:
                self._mongo_col.delete_one({'_id': ObjectId(session.sid)})
            response.delete_cookie(cookie_name, domain=cookie_domain, path=cookie_path)
            return

        # if session has not sid : insert it from db then set its sid (generate from document._id)
        # else replace it
        document = {
            'data': self._serialize_session_data(dict(session)),
            'expiration': self.get_expiration_time(app, session)
        }
        if session.sid is None:
            result = self._mongo_col.insert_one(document)
            session.sid = str(result.inserted_id)
        else:
            self._mongo_col.replace_one({'_id': ObjectId(session.sid)}, document)

        # if should_set_cookie:
        if self.should_set_cookie(app, session):
            # compute cookie_value: add prefix then sign session sid if required or
            cookie_value = self._sign_sid(app, self._add_sid_prefix(session.sid))
            # get extra cookie information: expires, httponly, secure, samesite
            cookie_params = dict(domain=cookie_domain, path=cookie_path,
                                 expires=document['expiration'], httponly=self.get_cookie_httponly(app),
                                 secure=self.get_cookie_secure(app))
            same_site = self.get_cookie_samesite(app)
            if same_site:
                cookie_params['samesite'] = same_site
            # set cookie
            response.set_cookie(cookie_name, cookie_value, **cookie_params)


class AutoCleanMongoSession(MongoSessionInterface):
    def __init__(self, mongo_collection: Collection, permanent: bool = True,
                 session_prefix: str = None, threshold_cleaner: Union[int, timedelta] = 1000):
        super().__init__(mongo_collection, permanent, session_prefix)
        self._threshold_cleaner: Union[int, timedelta] = threshold_cleaner
        self._clearner_cpt = 0
        self._clearner_last_access = datetime.utcnow()
        self._clearner_use_last_access = True if self._threshold_cleaner is None or isinstance(self._threshold_cleaner,
                                                                                               timedelta) else False

    def _cleanup(self) -> None:
        # remove all session whose expiration is before now - 4H
        now_minus_4_hours = datetime.now() - timedelta(hours=4)
        result = self._mongo_col.delete_many({
            'expiration': {
                '$lt': now_minus_4_hours
            }
        })
        current_app.logger.info("MONGO SESSION CLEANUP: %d session removed.", result.deleted_count)

    def _handle_cleaner(self) -> None:
        if self._threshold_cleaner is None:
            return
        if self._clearner_use_last_access:
            if (self._clearner_last_access + self._threshold_cleaner) < datetime.utcnow():
                self._cleanup()
                self._clearner_last_access = datetime.utcnow()
        else:
            self._clearner_cpt += 1
            if self._clearner_cpt > self._threshold_cleaner:
                self._cleanup()
                self._clearner_cpt = 0

    def save_session(
            self, app: Flask, session: MongoSession, response: Response
    ) -> None:
        try:
            super().save_session(app, session, response)
        finally:
            self._handle_cleaner()