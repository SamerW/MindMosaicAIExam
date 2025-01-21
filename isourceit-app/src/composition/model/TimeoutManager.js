import { makeAutoObservable } from 'mobx';

const SEC_IN_HOUR = 60 * 60;
const SEC_IN_MINUTES = 60;

class TimeoutManager {
  _timeout;

  _timeLeftSec;

  _intervalId = null;

  _onTimeDone = null;

  constructor(onTimeDone) {
    makeAutoObservable(this, {
      _intervalId: false,
      _onTimeDone: false,
      onTimeDone: false,
      running: false,
    });
    this._onTimeDone = onTimeDone;
  }

  get timeout() {
    return this._timeout;
  }

  set timeout(timeout) {
    this._timeout = timeout;
    this._computeTimeLeft();
  }

  set onTimeDone(otd) {
    this._onTimeDone = otd;
  }

  get timeLeftSeconds() {
    return this._timeLeftSec;
  }

  get timeLeftStr() {
    if (!this._timeLeftSec) {
      return this._timeLeftSec === 0 ? '00:00:00' : '<Unknown>';
    }
    const hours = Math.floor(this._timeLeftSec / SEC_IN_HOUR);
    let secLeft = this._timeLeftSec - hours * SEC_IN_HOUR;
    const minutes = Math.floor(secLeft / SEC_IN_MINUTES);
    secLeft -= minutes * SEC_IN_MINUTES;
    const hoursStr = hours < 10 ? `0${hours}` : hours;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    const secondsStr = secLeft < 10 ? `0${secLeft}` : secLeft;
    return `${hoursStr}:${minutesStr}:${secondsStr}`;
  }

  get running() {
    return !!this._intervalId;
  }

  startTimer() {
    if (this._intervalId) {
      console.warn('Timer already setup. Cannot start again.');
      return;
    }
    if (!this._timeout) {
      console.warn('Timeout not set. Cannot start timer.');
    }
    this._intervalId = setInterval(() => this._computeTimeLeft(), 1000);
  }

  stopTimer() {
    if (!this._intervalId) {
      console.warn('Timer not setup. Cannot stop.');
      return;
    }
    clearInterval(this._intervalId);
    this._intervalId = null;
  }

  _computeTimeLeft() {
    this._timeLeftSec = Math.floor((this._timeout - new Date()) / 1000);
    if (this._timeLeftSec <= 0) {
      if (this._onTimeDone) {
        this._onTimeDone();
      }
      this.stopTimer();
    }
  }
}

export default TimeoutManager;
