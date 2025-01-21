/* eslint-disable max-classes-per-file */

import { lostFocus } from './netLayer';

const LOST_FOCUS_THRESHOLD_SEC = 4;

class LostFocusHandle {
  questionId;

  startDate;

  startEventTimestamp;

  pageHidden;

  endEventTimestamp;

  endDate;

  delay;

  constructor(blurEvent, questionId) {
    this.questionId = questionId;
    this.startDate = new Date();
    this.startEventTimestamp = blurEvent.timestamp;
    this.pageHidden = false;
    this.endEventTimestamp = null;
    this.endDate = null;
    this.delay = null;
  }

  hidePage() {
    this.pageHidden = true;
  }

  closeOnFocus(event) {
    this.endDate = new Date();
    this.endEventTimestamp = event.timestamp;
    if (this.startEventTimestamp && this.endEventTimestamp) {
      this.delay = this.endEventTimestamp - this.startEventTimestamp;
    } else {
      this.delay = Math.round((this.endDate - this.startDate) / 1000);
    }
  }

  isAboveThreshold() {
    if (this.delay === null) {
      throw new Error('Illegal state, startDate or endDate missing');
    }
    return this.delay > LOST_FOCUS_THRESHOLD_SEC;
  }

  toActionJson() {
    return {
      questionId: this.questionId,
      timestamp: this.startDate,
      returnTimestamp: this.endDate,
      durationSeconds: Math.round(this.delay),
      pageHidden: this.pageHidden,
    };
  }
}

class FocusManager {
  _questionId = null;

  _currentHandle = null;

  _listenersSetup = false;

  _handler;

  get questionId() {
    return this._questionId;
  }

  set questionId(questionId) {
    this._questionId = questionId;
  }

  get running() {
    return this._listenersSetup;
  }

  setupListeners() {
    if (this._listenersSetup) {
      console.warn('Focus listeners already setup. Cannot setup again.');
      return;
    }
    this._handler = (e) => this._handleEvent(e);
    document.addEventListener('visibilitychange', this._handler);
    document.addEventListener('focus', this._handler);
    document.addEventListener('blur', this._handler);
    this._listenersSetup = true;
  }

  releaseListeners() {
    if (!this._listenersSetup) {
      console.warn('Focus listeners not setup. Cannot release.');
      return;
    }
    document.removeEventListener('visibilitychange', this._handler);
    document.removeEventListener('focus', this._handler);
    document.removeEventListener('blur', this._handler);
    this._listenersSetup = false;
  }

  async _handleEvent(e) {
    if (e.type === 'blur') {
      // Start handling focus lost
      if ((this._questionId ?? false) === false) {
        console.warn('Blur happened without any questionId set.');
      }
      this._currentHandle = new LostFocusHandle(e, this._questionId);
    } else if (e.type === 'visibilitychange' && this._currentHandle && document.hidden) {
      // mark page as hideen
      this._currentHandle.hidePage();
    } else if (e.type === 'focus' && this._currentHandle) {
      // Stop focus lost
      this._currentHandle.closeOnFocus(e);
      if (this._currentHandle.isAboveThreshold()) {
        // Threshold reached, send action
        const dataToSend = this._currentHandle.toActionJson();
        try {
          await lostFocus(dataToSend);
        } catch (err) {
          console.warn('Cannot send lostFocus action', err);
        }
      }
      this._currentHandle = null;
    }
  }
}

export default FocusManager;
