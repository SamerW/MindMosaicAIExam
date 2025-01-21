import { makeAutoObservable, runInAction } from 'mobx';
import { dateTimeStringToDate } from '../../services/timeService';
import ExamStudentInfo from './ExamStudentInfo';
import { generateSocratStudentsAuthUrls, getSocratDetails } from './netLayer';

class AdmSocrat {
  _id;

  _courseId;

  _name;

  _generationAuthUrl;

  _description;

  _questions;

  _authors;

  _students;

  _selectedChat;

  _created;

  _summaryNbQuestions;

  _summaryNbStudents;

  _editable;

  _detailsLoaded = false;

  _studentAuthentications = null;

  constructor(jsonData) {
    makeAutoObservable(this);
    if (jsonData) {
      this.fromJson(jsonData);
    }
  }

  get id() {
    return this._id;
  }

  get courseId() {
    return this._courseId;
  }

  get name() {
    return this._name;
  }

  get generationAuthUrl() {
    return this._generationAuthUrl;
  }

  get description() {
    return this._description;
  }

  get questions() {
    return this._questions;
  }

  get authors() {
    return this._authors;
  }

  get students() {
    return this._students;
  }

  get selectedChat() {
    return this._selectedChat;
  }

  get creationDate() {
    return this._created;
  }

  get nbQuestions() {
    if (this.questions) {
      return this.questions.length;
    }
    return this._summaryNbQuestions;
  }

  get nbStudents() {
    if (this.students) {
      return this.students.length;
    }
    return this._summaryNbStudents;
  }

  get editable() {
    return this._editable;
  }

  get detailsLoaded() {
    return this._detailsLoaded;
  }

  get studentAuthentications() {
    return this._studentAuthentications;
  }

  fromJson(data) {
    this._id = data.id ?? this._id;
    this._courseId = data.course_id ?? this._courseId;
    this._name = data.name ?? this._name;
    this._generationAuthUrl = data.student_generation_auth_url ?? this._generationAuthUrl;
    this._description = data.description ?? this._description;
    this._questions = data.questions ?? this._questions;
    this._durationMinutes = data.duration_minutes ?? this._durationMinutes;
    this._authors = data.authors ?? this._authors;
    this._students = data.students?.map((student) => new ExamStudentInfo(this._id, 'socrat', student))
      ?.sort((a, b) => a.username.localeCompare(b.username)) ?? this._students;
    this._selectedChat = data.selected_chat ?? this._selectedChat;
    this._created = dateTimeStringToDate(data.created) ?? this._created;
    this._summaryNbQuestions = data.nb_questions ?? this._summaryNbQuestions;
    this._summaryNbStudents = data.nb_students ?? this._summaryNbStudents;
    this._editable = this._students ? this._students.every((s) => !s.askedAccess) : false;
    this._studentAuthentications = null;
  }

  async loadDetails() {
    const examDetail = await getSocratDetails({ socratId: this._id });
    this.fromJson(examDetail, true);
    runInAction(() => {
      this._detailsLoaded = true;
    });
    return this;
  }

  async generateStudentAuthentications() {
    let studentAuthentications = await generateSocratStudentsAuthUrls({ socratId: this._id });
    studentAuthentications = studentAuthentications.sort((sa1, sa2) => sa1.username < sa2.username);
    runInAction(() => {
      this._studentAuthentications = studentAuthentications;
    });
    return studentAuthentications;
  }

  static createEmptySocratWithId(socratId) {
    const exam = new AdmSocrat();
    exam._id = socratId;
    return exam;
  }
}

export default AdmSocrat;
