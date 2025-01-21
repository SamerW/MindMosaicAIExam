import { makeAutoObservable, runInAction } from 'mobx';
import {
  administrativeAuthentication, generateAuthenticationToken, getUserContextInfo,
  initNetworkInterceptors, logout, ticketAuthentication,
} from './netLayer';
import ERROR_MANAGER from './ErrorManager';

class LoggedUser {
  _initiating = true;

  _loggedIn; // boolean

  _loggedUser; // {username, firstname?, lastname?}

  _role; // str

  _userContext; // {...}

  _initPromise; // Promise

  constructor() {
    makeAutoObservable(this, {
      getInitPromise: false,
    });
    initNetworkInterceptors(ERROR_MANAGER);

    this._initPromise = this._init();
  }

  _setUserContextInfo(userContext) {
    this._loggedIn = true;
    this._loggedUser = userContext.user;
    this._role = userContext.role;
    this._userContext = {
      examType: userContext.exam_type,
      examId: userContext.exam_id,
      examStarted: userContext.exam_started,
      examEnded: userContext.exam_ended,
      timeout: userContext.timeout,
    };
  }

  async _init() {
    // Attempt resuming session by getting context info
    this._initiating = true;
    this._loggedIn = false;
    this._loggedUser = null;
    this._role = null;
    this._userContext = {};
    try {
      // TODO: decomment
      const userContext = await getUserContextInfo({ failSilently: true });
      if (userContext) {
        this._setUserContextInfo(userContext);
      }
    } catch (e) {
      runInAction(() => {
        this._loggedIn = false;
      });
    } finally {
      runInAction(() => {
        this._initiating = false;
      });
    }
  }

  getInitPromise() {
    return this._initPromise.finally(() => this._loggedIn);
  }

  get ready() {
    return !this._initiating;
  }

  get loggedIn() {
    return this._loggedIn;
  }

  get user() {
    return this._loggedUser;
  }

  get context() {
    return this._userContext;
  }

  get role() {
    return this._role;
  }

  get isTeacherOrAdmin() {
    return this._role === 'admin' || this._role === 'teacher';
  }

  get isAdmin() {
    return this._role === 'admin';
  }

  get isStudent() {
    return this._role === 'student';
  }

  async disconnect() {
    try {
      await logout();
    } finally {
      runInAction(() => {
        this._loggedIn = false;
        this._loggedUser = null;
        this._role = null;
        this._userContext = {};
      });
    }
  }

  async administrativeAuth({ username, password }) {
    const userContext = await administrativeAuthentication({ username, password });
    this._setUserContextInfo(userContext);
  }

  async generateAuthToken({ examType, examId, username }) {
    if (this.loggedIn) {
      console.warn('Cannot log in; already logged in.');
    }
    return generateAuthenticationToken({ username, examType, examId });
  }

  async ticketAuth({ ticket }) {
    if (this.loggedIn) {
      console.warn('Cannot log in; already logged in.');
    }
    const userContext = await ticketAuthentication({ ticket });
    this._setUserContextInfo(userContext);
  }
}

export default LoggedUser;
