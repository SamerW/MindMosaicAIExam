import { makeAutoObservable, runInAction } from 'mobx';
import StuExam from './StuExam';
import SocketManager from './SocketManager';
import StuSocrat from './StuSocrat';

class StuManager {
  _exam;

  _loading = 0;

  _loadingError = null;

  _socketManager = null;

  constructor({
    examType, examId, examStarted, examEnded, timeout,
  }) {
    makeAutoObservable(this);
    if (examType === 'exam') {
      this._exam = new StuExam({
        id: examId,
        started: examStarted,
        ended: examEnded,
        timeout,
      });
    } else if (examType === 'socrat') {
      this._exam = new StuSocrat({
        id: examId,
        started: examStarted,
        ended: examEnded,
      });
    } else {
      throw new Error(`Unmanaged exam type ${examType}.`);
    }

    this._socketManager = new SocketManager();
    this._socketManager.answerCallback = (answer) => this._exam.handleChatAnswer(answer);
    this._init();
  }

  get exam() {
    return this._exam;
  }

  get loading() {
    return this._loading > 0;
  }

  get loadingError() {
    return this._loadingError;
  }

  get socketManager() {
    return this._socketManager;
  }

  async _init() {
    if (!this._exam.ended) {
      this._loading += 1;
      try {
        await this._exam.refresh();
      } catch (e) {
        runInAction(() => {
          console.warn(e);
          this._loadingError = e;
        });
      } finally {
        runInAction(() => {
          this._loading -= 1;
        });
      }
    }
  }
}

export default StuManager;
