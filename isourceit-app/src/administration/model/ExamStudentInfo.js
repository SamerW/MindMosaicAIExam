import { makeAutoObservable, runInAction } from 'mobx';
import { dateTimeStringToDate, dateToLocalDateTimeString } from '../../services/timeService';
import { loadStudentActions } from './netLayer';

class ExamStudentInfo {
  _examId;

  _examType;

  _username;

  _askedAccess;

  _firstTimestamp;

  _nbActions;

  _submitted;

  _endedExam;

  _actions;

  _loadingActions = 0;

  constructor(examId, examType, jsonData) {
    makeAutoObservable(this, {
      _examId: false,
      _examType: false,
    });
    this._examId = examId;
    this._examType = examType;
    if (jsonData) {
      this.fromJson(jsonData);
    }
  }

  get username() {
    return this._username;
  }

  set username(u) {
    this._username = u;
  }

  get askedAccess() {
    return this._askedAccess;
  }

  get firstTimestamp() {
    return this._firstTimestamp;
  }

  get formatedFirstTimestamp() {
    return dateToLocalDateTimeString(this._firstTimestamp) ?? 'Not started yet';
  }

  get nbActions() {
    return this._nbActions;
  }

  get submitted() {
    return this._submitted;
  }

  get endedExam() {
    return this._endedExam;
  }

  get actions() {
    return this._actions;
  }

  get loadingActions() {
    return this._loadingActions > 0;
  }

  fromJson(data) {
    this._username = data.username ?? this._username;
    this._askedAccess = data.asked_access ?? this._askedAccess;
    this._firstTimestamp = dateTimeStringToDate(data.first_timestamp) ?? this._firstTimestamp;
    this._nbActions = data.nb_actions ?? this._nbActions;
    this._submitted = data.submitted ?? this._submitted;
    this._endedExam = data.ended_exam ?? this._endedExam;
  }

  async loadActions(force = false) {
    if (this._actions && !force) {
      return this._actions;
    }
    this._loadingActions += 1;
    try {
      let actionsExamType;
      if (this._examType === 'socrat') {
        actionsExamType = 'socrats';
      } else {
        actionsExamType = 'exams';
      }
      let actions = await loadStudentActions({
        examId: this._examId,
        studentUsername: this._username,
        examType: actionsExamType,
      });
      actions = actions.map((act) => {
        /* eslint-disable no-param-reassign */
        act.timestamp = dateTimeStringToDate(act.timestamp);
        if (act.removed) {
          act.removed = dateTimeStringToDate(act.removed);
        }
        if (act.return_timestamp) {
          act.return_timestamp = dateTimeStringToDate(act.return_timestamp);
        }
        return act;
        /* eslint-enable no-param-reassign */
      });
      runInAction(() => {
        this._actions = actions;
      });
      return actions;
    } finally {
      this._loadingActions -= 1;
    }
  }
}

export default ExamStudentInfo;
