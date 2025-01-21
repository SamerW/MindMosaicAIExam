import { makeAutoObservable, runInAction } from 'mobx';
import { getExamReport, getReportInfo, getSocratReport } from './netLayer';

const UPDATE_TIMEOUT_DELAY_MS = 1000;

const MAX_ERROR_UPDATE = 3;

class ReportArchive {
  _id;

  _examId;

  _state;

  _progression;

  _creationDate;

  _readyDate;

  _archiveUrl;

  _autoUpdate = false;

  _updateTimeoutId = null;

  _error_counter = 0;

  _error = null;

  constructor(jsonData) {
    makeAutoObservable(this);
    if (jsonData) {
      this.fromJson(jsonData);
    }
  }

  get id() {
    return this._id;
  }

  get examId() {
    return this._examId;
  }

  get state() {
    return this._state;
  }

  get isPending() {
    return this._state === 'pending';
  }

  get isReady() {
    return this._state === 'ready';
  }

  get isError() {
    return this._state === 'error';
  }

  get progression() {
    return this._progression;
  }

  get creationDate() {
    return this._creationDate;
  }

  get readyDate() {
    return this._readyDate;
  }

  get archiveUrl() {
    return this._archiveUrl;
  }

  get autoupdate() {
    return this._autoUpdate;
  }

  get error() {
    return this._error;
  }

  fromJson(jsonData) {
    this._id = jsonData.id ?? this._id;
    this._exam_id = jsonData.exam_id ?? this._exam_id;
    this._state = jsonData.state ?? this._state;
    this._progression = jsonData.progression ?? this._progression;
    this._creationDate = jsonData.creation_date ?? this._creationDate;
    this._readyDate = jsonData.ready_date ?? this._readyDate;
    this._archiveUrl = jsonData.archive_url ?? this._archiveUrl;
  }

  async updateState() {
    if (this._state !== 'pending') {
      throw new Error('Report state not pending. Cannot update');
    }
    const reportData = await getReportInfo({ reportId: this._id });
    this.fromJson(reportData);
    return this;
  }

  async _doAutoUpdate() {
    try {
      await this.updateState();
    } catch (e) {
      console.warn('update state error happened');
      runInAction(() => {
        this._error_counter += 1;
        if (this._error_counter > MAX_ERROR_UPDATE) {
          this._state = 'error';
          this._error = e;
        }
      });
    } finally {
      if (this.isPending && this._error_counter <= MAX_ERROR_UPDATE) {
        this._setFutureUpdate();
      } else {
        this.stopAutoUpdate();
      }
    }
  }

  async _setFutureUpdate() {
    if (this._updateTimeoutId) {
      console.warn('Cannot set future update: unable update timeout id');
      return;
    }
    this._updateTimeoutId = setTimeout(() => {
      this._updateTimeoutId = null;
      this._doAutoUpdate();
    }, UPDATE_TIMEOUT_DELAY_MS);
  }

  startAutoUpdate() {
    if (this._autoUpdate) {
      console.warn('Report: autoupdate already started');
      return;
    }
    this._autoUpdate = true;
    this._error_counter = 0;
    this._setFutureUpdate();
  }

  stopAutoUpdate() {
    if (!this._autoUpdate) {
      console.warn('Report: autoupdate not started');
      return;
    }
    this._autoUpdate = false;
    if (this._updateTimeoutId) {
      clearTimeout(this._updateTimeoutId);
      this._updateTimeoutId = null;
    }
  }

  static async request_exam_report_archive(examId) {
    const reportData = await getExamReport({ examId });
    return new ReportArchive(reportData);
  }

  static async request_socrat_report_archive(socratId) {
    const reportData = await getSocratReport({ socratId });
    return new ReportArchive(reportData);
  }
}

export default ReportArchive;
