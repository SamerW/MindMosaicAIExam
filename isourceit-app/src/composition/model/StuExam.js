import { makeAutoObservable, runInAction } from 'mobx';
import { dateTimeStringToDate } from '../../services/timeService';
import StuExamQuestion from './StuExamQuestion';
import {
  changeQuestion, getExamDetails, startExam, submitExam,
} from './netLayer';
import FocusManager from './FocusManager';
import TimeoutManager from './TimeoutManager';

class StuExam {
  _id;

  _name;

  _description;

  _durationMinutes;

  _timeout;

  _chatChoices;

  _started;

  _ended;

  _nbQuestion;

  _questions; // []

  _currentQuestion;

  _focusManager;

  _timeoutManager;

  _onSubmit = false;

  constructor(jsonData) {
    makeAutoObservable(this, {
      _focusManager: false,
      _timeoutManager: false,
      handleChatAnswer: false,
    });
    this._focusManager = new FocusManager();
    this._timeoutManager = new TimeoutManager(() => {
      this._ended = true;
    });
    if (jsonData) {
      this.fromJson(jsonData);
      this._manageFocusAndTimeout();
    }
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  get description() {
    return this._description;
  }

  get durationMinutes() {
    return this._durationMinutes;
  }

  get timeout() {
    return this._timeout;
  }

  get chatChoices() {
    return this._chatChoices;
  }

  get started() {
    return this._started;
  }

  get ended() {
    return this._ended;
  }

  get nbQuestions() {
    return this._nbQuestions;
  }

  get questions() {
    return this._questions;
  }

  get currentQuestion() {
    return this._currentQuestion;
  }

  get focusManager() {
    return this._focusManager;
  }

  get timeoutManager() {
    return this._timeoutManager;
  }

  get onSubmit() {
    return this._onSubmit;
  }

  fromJson(jsonData) {
    this._id = jsonData.id ?? this._id;
    this._name = jsonData.name ?? this._name;
    this._description = jsonData.description ?? this._description;
    this._durationMinutes = jsonData.duration_minutes ?? this._durationMinutes;
    this._timeout = dateTimeStringToDate(jsonData.timeout) ?? this._timeout;
    this._chatChoices = jsonData.chat_choices ?? this._chatChoices;
    this._started = jsonData.started ?? this._started;
    this._ended = jsonData.ended ?? this._ended;
    this._nbQuestions = jsonData.nb_questions ?? this._nbQuestions;
    if (jsonData.questions) {
      this._questions = Object.values(jsonData.questions)
        .map((q) => new StuExamQuestion(q))
        .sort((a, b) => a.id - b.id);
    }
    // Set timeout manager timeout
    this._timeoutManager.timeout = this._timeout;
    // Set current question if required
    if ((jsonData.current_question_idx ?? false) !== false) {
      const currentQuestion = this._questions.find((q) => q.id === jsonData.current_question_idx);
      if (currentQuestion) {
        this._changeCurrentQuestion(currentQuestion);
      } else {
        console.warn('Question requested does not exist.');
      }
    }
  }

  async refresh() {
    const jsonData = await getExamDetails({ examId: this._id });
    this.fromJson(jsonData);
    // If the exam is started, no ended, but does not have any current question,
    // we set it to the first one
    // if (this._started && !this._ended && !this._currentQuestion) {
    //   this._changeCurrentQuestion(this._questions[0]);
    // }
  }

  async startExam() {
    if (this._started) {
      console.warn('Exam already started.');
      return;
    }
    const data = await startExam();
    if (!data.exam_started) {
      console.warn('This exam has not strated');
      return;
    }
    await this.refresh();
    this._manageFocusAndTimeout();
    // if (!this._questions || !this._questions.length) {
    //   console.warn('This exam has no question to propse!');
    // }
    // this._changeCurrentQuestion(this._questions[0]);
  }

  async changeQuestion(nextQuestionId) {
    if (!this._started || this._ended) {
      console.warn('Exam not started or ended.');
      return;
    }
    this._onSubmit = false;
    if (!this._currentQuestion) {
      console.warn('Change question called without any question set. Wierd.');
      return;
    }
    if (this._currentQuestion.id === nextQuestionId) {
      return;
    }
    const nextQuestion = this._questions.find((q) => q.id === nextQuestionId);
    if (!nextQuestion) {
      console.warn('Question requested does not exist.');
      return;
    }
    // Resync old question
    this.currentQuestion.resync();
    await changeQuestion({
      questionId: this._currentQuestion?.id,
      nextQuestionId,
    });

    this._changeCurrentQuestion(nextQuestion);
  }

  goOnSubmit() {
    if (!this._started || this._ended) {
      console.warn('Exam not started or ended.');
      return;
    }
    // Resync currentQuestion
    this.currentQuestion.resync();
    this._onSubmit = true;
  }

  rollbackOnSubmit() {
    if (!this._started || this._ended) {
      console.warn('Exam not started or ended.');
      return;
    }
    this._onSubmit = false;
  }

  async submitExam() {
    if (!this._started || this._ended) {
      console.warn('Exam not started or ended.');
      return;
    }
    const data = await submitExam();
    if (!data.exam_ended) {
      console.warn('This exam has not ended');
      return;
    }
    runInAction(() => {
      this._ended = true;
      this._changeCurrentQuestion(null);
      this._manageFocusAndTimeout();
    });
  }

  async handleChatAnswer(answer) {
    // find proper question and chat action, then update answer and/or pending state
    if ((answer.question_idx ?? false) === false || (answer.action_id ?? false) === false) {
      console.warn('Received answer without question idx or action id');
      return;
    }
    const question = this._questions[answer.question_idx];
    if (!question) {
      console.warn(`Received answer with bad question idx: ${answer.question_idx}`);
      return;
    }
    // Ensure there is no pending chat action promise for question
    await question.getChatActionPromise();
    // get actionTabs
    const actionTab = question.chatActions[answer.chat_id];
    if (!actionTab) {
      console.warn(`Received answer with bad chat id: ${answer.chat_id}`);
      return;
    }
    // get action, should be the last
    let action = actionTab[actionTab.length - 1];
    if (action?.id !== answer.action_id) {
      // Because of network, novel action might be
      console.warn('Received answer that does not match last action. Attemp to find it.');
      action = actionTab?.find((act) => act.id === answer.action_id);
    }
    if (action?.id !== answer.action_id) {
      console.warn(`Received answer with bad action id: ${answer.action_id}`);
      return;
    }
    runInAction(() => {
      if (answer.answer) {
        if (action.answer) {
          action.answer += answer.answer;
        } else {
          action.answer = answer.answer;
        }
      }
      if (answer.ended) {
        action.pending = false;
      }
    });
  }

  _changeCurrentQuestion(question) {
    this._currentQuestion = question;
    this._focusManager.questionId = question?.id;
  }

  _manageFocusAndTimeout() {
    if (this.started && !this.ended) {
      if (!this._focusManager.running) {
        this._focusManager.setupListeners();
      }
      if (!this._timeoutManager.running) {
        this._timeoutManager.startTimer();
      }
    } else {
      if (this._focusManager.running) {
        this._focusManager.releaseListeners();
      }
      if (this._timeoutManager.running) {
        this._timeoutManager.stopTimer();
      }
    }
  }
}

export default StuExam;
