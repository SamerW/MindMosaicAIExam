import { makeAutoObservable, runInAction } from 'mobx';
import { dateTimeStringToDate } from '../../services/timeService';
import {
  addExternalResourceQuestion, askChatAIQuestion, removeExternalResourceQuestion,
  writeFinalAnswerQuestion, writeInitialAnswerQuestion,
} from './netLayer';

class StuExamQuestion {
  _id;

  _label;

  _initAnswer;

  _pendingInitAnswerTs;

  _finalAnswer;

  _pendingFinalAnswerTs;

  _chatActions;

  _resources;

  _chatActionPromise;

  constructor(jsonData) {
    makeAutoObservable(this, {
      _pendingInitAnswer: false,
      _pendingFinalAnswer: false,
      _chatActionPromise: false,
      getChatActionPromise: false,
    });
    if (jsonData) {
      this.fromJson(jsonData);
    }
  }

  get id() {
    return this._id;
  }

  get label() {
    return this._label;
  }

  get initAnswer() {
    return this._initAnswer;
  }

  set initAnswer(ans) {
    if (!this._pendingInitAnswerTs) {
      this._pendingInitAnswerTs = new Date();
    }
    this._initAnswer = ans;
  }

  get finalAnswer() {
    return this._finalAnswer;
  }

  set finalAnswer(ans) {
    if (!this._pendingFinalAnswerTs) {
      this._pendingFinalAnswerTs = new Date();
    }
    this._finalAnswer = ans;
  }

  get chatActions() {
    return this._chatActions;
  }

  get resources() {
    return this._resources;
  }

  async getChatActionPromise() {
    return this._chatActionPromise ?? false;
  }

  fromJson(jsonData) {
    this._id = jsonData.id ?? this._id;
    this._label = jsonData.label ?? this._label;
    this._initAnswer = jsonData.init_answer ?? this._initAnswer;
    this._finalAnswer = jsonData.final_answer ?? this._finalAnswer;
    this._chatActions = StuExamQuestion._parseChatActions(jsonData.chat_actions)
    ?? this._chatActions;
    this._resources = jsonData.resources ?? this._resources;
  }

  async askChatAI({ prompt, answer, chat,image }) {

    await this.resync();    
    this._chatActionPromise = askChatAIQuestion({
      questionId: this._id,
      prompt,
      answer,
      chatId: chat.id,
      chatKey: chat.chat_key,
      modelKey: chat.model_key,
      image,
     
    });
    const action = await this._chatActionPromise;

    this._chatActionPromise = null;
    runInAction(() => {
      let actionTab = this._chatActions[chat.id];
      if (!actionTab) {
        console.warn('Received chat action but action tab unknown');
        actionTab = [];
        this._chatActions[chat.id] = actionTab;
      }
      actionTab.push({
        id: action.id,
        prompt: action.prompt,
        answer,
        pending: !action.achieved,
        timestamp: dateTimeStringToDate(action.timestamp),
      });
    });
  }

  async addExternalResource({ title, description, rscType }) {
    await this.resync();
    const action = await addExternalResourceQuestion({
      questionId: this._id, title, description, rscType,
    });
    runInAction(() => {
      this._resources.push({
        id: action.id,
        title: action.title,
        description: action.description,
        rsc_type: action.rsc_type,
        timestamp: dateTimeStringToDate(action.timestamp),
      });
    });
  }

  async deleteExternalResource(actionId) {
    await this.resync();
    await removeExternalResourceQuestion({ actionId });
    runInAction(() => {
    // Since time has spent, we re-find the proper idx to splice the array
      const idx = this._resources.findIndex((act) => act.id === actionId);
      if (idx >= 0 && idx < this._resources.length) {
        this._resources.splice(idx, 1);
      }
    });
  }

  async resync() {
    if (this._pendingInitAnswerTs) {
      await writeInitialAnswerQuestion({
        questionId: this._id,
        text: this._initAnswer,
        timestamp: this._pendingInitAnswerTs,
      });
      this._pendingInitAnswerTs = null;
    }
    if (this._pendingFinalAnswerTs) {
      await writeFinalAnswerQuestion({
        questionId: this._id,
        text: this._finalAnswer,
        timestamp: this._pendingFinalAnswerTs,
      });
      this._pendingFinalAnswerTs = null;
    }
  }

  static _parseChatActions(chatActions) {
    if (!chatActions) {
      return null;
    }
    Object.values(chatActions).flatMap((actTab) => actTab).forEach((act) => {
      // eslint-disable-next-line no-param-reassign
      act.timestamp = dateTimeStringToDate(act.timestamp);
    });
    return chatActions;
  }
}

export default StuExamQuestion;
