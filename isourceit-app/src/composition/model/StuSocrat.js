import { makeAutoObservable, runInAction } from 'mobx';
import StuExamQuestion from './StuExamQuestion';
import {
  changeQuestion, getSocratDetails, startExam, submitExam,
} from './netLayer';
import FocusManager from './FocusManager';

class StuSocrat {
  _id;

  _name;

  _description;

  _chatChoices;

  _started;

  _ended;

  _nbQuestion;

  _questions; // []

  _currentQuestion;

  _focusManager;

  _onSubmit = false;

  constructor(jsonData) {
    makeAutoObservable(this, {
      _focusManager: false,
      handleChatAnswer: false,
    });
    this._focusManager = new FocusManager();
    if (jsonData) {
      this.fromJson(jsonData);
      this._manageFocus();
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

  get onSubmit() {
    return this._onSubmit;
  }

  fromJson(jsonData) {
    this._id = jsonData.id ?? this._id;
    this._name = jsonData.name ?? this._name;
    this._description = jsonData.description ?? this._description;
    this._chatChoices = jsonData.chat_choices ?? this._chatChoices;
    this._started = jsonData.started ?? this._started;
    this._ended = jsonData.ended ?? this._ended;
    this._nbQuestions = jsonData.nb_questions ?? this._nbQuestions;
    if (jsonData.questions) {
      this._questions = Object.values(jsonData.questions)
        .map((q) => new StuExamQuestion(q))
        .sort((a, b) => a.id - b.id);
    }
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
    const jsonData = await getSocratDetails({ socratId: this._id });
    this.fromJson(jsonData);
  }

  async startSocrat() {
    if (this._started) {
      console.warn('Socrat already started.');
      return;
    }
    const data = await startExam(); // yes, startExam even for socrat, same action
    if (!data.exam_started) {
      console.warn('This exam has not strated');
      return;
    }
    await this.refresh();
    this._manageFocus();
  }

  async changeQuestion(nextQuestionId) {
    if (!this._started || this._ended) {
      console.warn('Socrat not started or ended.');
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
      console.warn('Socrat not started or ended.');
      return;
    }
    // Resync currentQuestion
    this.currentQuestion.resync();
    this._onSubmit = true;
  }

  rollbackOnSubmit() {
    if (!this._started || this._ended) {
      console.warn('Socrat not started or ended.');
      return;
    }
    this._onSubmit = false;
  }

  async submitSocrat() {
    if (!this._started || this._ended) {
      console.warn('Socrat not started or ended.');
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
      this._manageFocus();
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

  _manageFocus() {
    if (this.started && !this.ended) {
      if (!this._focusManager.running) {
        this._focusManager.setupListeners();
      }
    } else if (this._focusManager.running) {
      this._focusManager.releaseListeners();
    }
  }
}

export default StuSocrat;
