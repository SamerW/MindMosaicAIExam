import { makeAutoObservable, runInAction } from 'mobx';
import {
  getExamSummary, updateExam, createExam, getAppAvailableChats,getAppAvailableSearchEngines, clearReports,
  getSocratsSummary, updateSocrat, createSocrat, getDefaultSocratInitPrompt,
} from './netLayer';
import AdmExam from './AdmExam';
import AdmSocrat from './AdmSocrat';

class AdmExamManager {
  _examsSummary = null;

  _socratsSummary = null;

  _currentExam = null;

  _availableChats = null;

  _availableSearchEngines = null;

  _defaultSocratInitPrompt = null;

  _loading = 0;

  _loadingError = null;

  constructor() {
    makeAutoObservable(this);
  }

  get examsSummary() {
    return this._examsSummary ?? [];
  }

  get socratsSummary() {
    return this._socratsSummary ?? [];
  }

  get currentExam() {
    return this._currentExam;
  }

  get availableChats() {
    return this._availableChats;
  }

  get defaultSocratInitPrompt() {
    return this._defaultSocratInitPrompt;
  }

  get loading() {
    return this._loading > 0;
  }

  get loadingError() {
    return this._loadingError;
  }

  async loadExamsSummary({ force = false }) {
    if (this._examsSummary && !force) {
      return { exams: this._examsSummary, socrats: this._socratsSummary };
    }
    this._loading += 1;
    try {
      const [examsSumData, socratsSumData] = await Promise.all([
        getExamSummary(),
        getSocratsSummary(),
      ]);
      runInAction(() => {
        this._examsSummary = examsSumData.map((exam) => new AdmExam(exam));
        this._socratsSummary = socratsSumData.map((socrat) => new AdmSocrat(socrat));
      });
      return { exams: this._examsSummary, socrats: this._socratsSummary };
    } catch (e) {
      runInAction(() => {
        console.warn(e);
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  async loadDetailedExam({ examId, force = false }) {
    if (this._currentExam && this.currentExam.detailsLoaded && !force) {
      return this._currentExam;
    }
    this._currentExam = null;
    let exam = this._examsSummary?.find((e) => e.id === examId);
    if (!exam) {
      exam = AdmExam.createEmptyExamWithId(examId);
    }
    this._loading += 1;
    try {
      await exam.loadDetails();
      runInAction(() => {
        this._currentExam = exam;
      });
      return exam;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  async loadDetailedSocrat({ examId, force = false }) {
    if (this._currentExam && this.currentExam.detailsLoaded && !force) {
      return this._currentExam;
    }
    this._currentExam = null;
    let socrat = this._socratsSummary?.find((e) => e.id === examId);
    if (!socrat) {
      socrat = AdmSocrat.createEmptySocratWithId(examId);
    }
    this._loading += 1;
    try {
      await socrat.loadDetails();
      runInAction(() => {
        this._currentExam = socrat;
      });
      return socrat;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  async loadAvailableChats() {
    if (this._availableChats) {
      return this._availableChats;
    }
    this._loading += 1;
    try {
      const availableChats = await getAppAvailableChats();
      runInAction(() => {
        this._availableChats = availableChats;
      });
      return availableChats;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  async loadAvailableSearchEngines() {
    if (this._availableSearchEngines) {
      return this._availableSearchEngines;
    }
    this._loading += 1;
    try {
      const availableSearchEngines = await getAppAvailableSearchEngines();
      console.log("hhhe");
      console.log(availableSearchEngines);
      runInAction(() => {
        this._availableSearchEngines = availableSearchEngines;
      });
      return availableSearchEngines;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  async loadDefaultSocratInitPrompt() {
    if (this._defaultSocratInitPrompt) {
      return this._defaultSocratInitPrompt;
    }
    this._loading += 1;
    try {
      const defaultSocratInitPrompt = await getDefaultSocratInitPrompt();
      runInAction(() => {
        this._defaultSocratInitPrompt = defaultSocratInitPrompt;
      });
      return defaultSocratInitPrompt;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  async saveExam(examJson) {
    this._loading += 1;
    try {
      if (examJson.id) {
        if (!this._currentExam || this._currentExam.id !== examJson.id) {
          throw new Error('Illegal state exception: attempt to update exam with wrong id or not current exam set');
        }
        // Update
        const examData = await updateExam({ exam: examJson });
        this._currentExam.fromJson(examData);
      } else {
        // Create
        const examData = await createExam({ exam: examJson });
        runInAction(() => {
          this._currentExam = new AdmExam(examData);
          if (this._examsSummary) {
            this._examsSummary.push(this._currentExam);
          }
        });
      }
      return this._currentExam;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  async saveSocrat(socratJson) {
    this._loading += 1;
    try {
      if (socratJson.id) {
        if (!this._currentExam || this._currentExam.id !== socratJson.id) {
          throw new Error('Illegal state exception: attempt to update socrat with wrong id or not current socrat set');
        }
        // Update
        const socratData = await updateSocrat({ socrat: socratJson });
        this._currentExam.fromJson(socratData);
      } else {
        // Create
        const socratData = await createSocrat({ socrat: socratJson });
        runInAction(() => {
          this._currentExam = new AdmSocrat(socratData);
          if (this._socratsSummary) {
            this._socratsSummary.push(this._currentExam);
          }
        });
      }
      return this._currentExam;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  static async clearReports() {
    await clearReports();
  }
}

export default AdmExamManager;
