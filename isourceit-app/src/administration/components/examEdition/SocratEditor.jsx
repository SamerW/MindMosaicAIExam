import { observer } from 'mobx-react';
import React, { useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Col, Form, Row,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import ExamMgmtStore from '../ExamMgmtStore';
import { AdvancedLoading } from '../../../common/components/Loading';
import RichTextEditor from './RichTextEditor';

function initState() {
  return {
    loading: true,
    saving: false,
    name: '',
    description: '',
    questions: [],
    durationMinutes: 0,
    rawAuthors: '',
    rawStudents: '',
    defaultInitPrompt: '',
    availableChats: [],
    selectedChat: { id: '' },
    validatedForm: false,
  };
}

function computeSelectedChat(availableChats, examSelectedChat = null) {
  if (!examSelectedChat || !examSelectedChat.id) {
    return { id: '' };
  }
  const selectedChatCol = availableChats
    .filter((chat) => chat.id === examSelectedChat.id)
    .map((chat) => ({
      id: chat.id,
      apiKey: examSelectedChat.api_key ?? null,
      privateKeyRequired: chat.privateKeyRequired,
    }));
  if (selectedChatCol.length === 0) {
    return { id: '' };
  }
  if (selectedChatCol.length > 1) {
    console.warn('TOO MUCH chat selected for Socrat. Keep only the first one');
  }
  return selectedChatCol[0];
}

function reduce(state, action) {
  switch (action.type) {
    case 'set-loading':
      return { ...state, loading: true };
    case 'set-for-creation': {
      const { defaultInitPrompt, availableChats } = action;
      return {
        ...initState(),
        loading: false,
        availableChats,
        defaultInitPrompt,
      };
    }
    case 'set-for-edition': {
      const { socrat, defaultInitPrompt, availableChats } = action;
      return {
        ...state,
        loading: false,
        name: socrat.name,
        description: socrat.description,
        questions: socrat.questions?.length ? [...socrat.questions] : [],
        rawAuthors: socrat.authors.map((a) => a.username).join('\n'),
        rawStudents: socrat.students.map((s) => s.username).join('\n'),
        availableChats,
        defaultInitPrompt,
        selectedChat: computeSelectedChat(availableChats, socrat.selectedChat),
      };
    }
    case 'set-raw-field':
      return { ...state, [action.field]: action.value };
    case 'set-duration':
      return { ...state, durationMinutes: Number(action.value) };
    case 'add-question':
      return {
        ...state,
        questions: [...state.questions, { question: '', answer: '', initPrompt: '' }],
      };
    case 'set-question-initPrompt':
      return {
        ...state,
        questions: [
          ...state.questions.slice(0, action.questionIdx),
          { ...state.questions[action.questionIdx], initPrompt: action.value },
          ...state.questions.slice(action.questionIdx + 1),
        ],
      };
    case 'set-question-question':
      return {
        ...state,
        questions: [
          ...state.questions.slice(0, action.questionIdx),
          { ...state.questions[action.questionIdx], question: action.value },
          ...state.questions.slice(action.questionIdx + 1),
        ],
      };
    case 'set-question-answer':
      return {
        ...state,
        questions: [
          ...state.questions.slice(0, action.questionIdx),
          { ...state.questions[action.questionIdx], answer: action.value },
          ...state.questions.slice(action.questionIdx + 1),
        ],
      };

    case 'delete-question':
      return {
        ...state,
        questions: state.questions.filter((_, idx) => idx !== action.questionIdx),
      };
    case 'set-selected-chat':
      return {
        ...state,
        selectedChat: computeSelectedChat(state.availableChats, { id: action.value }),
      };
    case 'set-chat-apiKey':
      return {
        ...state,
        selectedChat: { ...state.selectedChat, apiKey: action.value },
      };
    case 'set-saving':
      return { ...state, saving: action.value };
    case 'set-validated-form':
      return { ...state, validatedForm: action.value };
    default:
      throw new Error(`Illegal action type ${action.type}.`);
  }
}

function computeSocratJsonFromState(state, examId) {
  const jsonRep = {
    name: state.name.trim(),
    description: state.description.trim(),
    questions: state.questions.map((q) => {
      const cleanedQuestion = {
        question: q.question.trim(),
        answer: q.answer.trim(),
      };
      const initPrompt = q.initPrompt.trim();
      if (initPrompt) {
        cleanedQuestion.init_prompt = initPrompt;
      }
      return cleanedQuestion;
    }).filter((q) => !!q.question && !!q.answer),
    authors: state.rawAuthors.split('\n')
      .map((a) => a.trim()).filter((a) => !!a)
      .map((a) => ({ username: a })),
    students: state.rawStudents.split('\n')
      .map((a) => a.trim()).filter((a) => !!a)
      .map((a) => ({ username: a })),
    selected_chat: {
      id: state.selectedChat.id,
      api_key: state.selectedChat.apiKey,
    },
  };
  if (examId) {
    jsonRep.id = examId;
  }
  return jsonRep;
}

function SocratEditor({ newSocrat }) {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { manager } = useContext(ExamMgmtStore);
  const [state, dispatch] = useReducer(reduce, initState());

  useEffect(() => {
    dispatch({ type: 'set-loading' });
    if (newSocrat && !examId) {
      Promise.all([
        manager.loadAvailableChats(),
        manager.loadDefaultSocratInitPrompt(),
      ]).then(([availableChats, defaultInitPrompt]) => dispatch({
        type: 'set-for-creation', availableChats, defaultInitPrompt,
      }));
    } else if (!newSocrat && examId) {
      Promise.all([
        manager.loadAvailableChats(),
        manager.loadDefaultSocratInitPrompt(),
        manager.loadDetailedSocrat({ examId }),
      ]).then(([availableChats, defaultInitPrompt, socrat]) => dispatch({
        type: 'set-for-edition', socrat, defaultInitPrompt, availableChats,
      }));
    } else {
      console.warn(`Illegal state for exam creation. NewExam: ${newSocrat} | examId: ${examId}`);
    }
  }, [manager, newSocrat, examId]);

  const submit = (e) => {
    e.preventDefault();

    // Check form validaty
    const form = e.currentTarget;
    const formValidity = form.checkValidity();
    // Check state validaty
    const stateValidity = !!(state.name && state.description
      && state.questions.length > 0
      && state.questions.every((q) => !!q && !!q.question && !!q.answer));
    // Set validated
    dispatch({ type: 'set-validated-form', value: true });
    // If validation failed, stop here
    if (formValidity === false || stateValidity === false) {
      e.stopPropagation();
      return;
    }

    const jsonRep = computeSocratJsonFromState(state, examId);
    dispatch({ type: 'set-saving', value: true });
    manager.saveSocrat(jsonRep).then(() => {
      navigate(-1);
    }).catch((er) => {
      dispatch({ type: 'set-saving', value: false });
      // dispatch({ type: 'set-validated-form', value: false });
      console.warn(er);
    });
  };

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={12} md={12} lg={10}>
        <AdvancedLoading
          loading={manager.loading}
          loadingError={manager.loadingError}
        >
          <Form onSubmit={submit} noValidate validated={state.validatedForm}>
            <fieldset disabled={state.saving}>
              <Row>
                <Col xs={12} md={6}>
                  <h3 className="text-primary">General</h3>
                  <Form.Group className="mb-3" controlId="exam-edit-name">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Your questionnaire name"
                      value={state.name}
                      onChange={(e) => dispatch({ type: 'set-raw-field', field: 'name', value: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="exam-edit-description">
                    <Form.Label>Description</Form.Label>
                    <RichTextEditor
                      value={state.description}
                      onChange={(value) => dispatch({ type: 'set-raw-field', field: 'description', value })}
                      placeholder="A text that will be given to student before they start the exam"
                      required
                      validated={state.validatedForm}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <h3 className="text-primary">Questions</h3>
                  {
                    state.questions?.map((question, idx) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <Form.Group className="mb-1" controlId={`exam-edit-question-${idx}`} key={idx}>
                        <Form.Label>
                          <b>{`Question ${idx + 1}`}</b>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => dispatch({ type: 'delete-question', questionIdx: idx })}
                            className="ms-3"
                          >
                            <FontAwesomeIcon icon={faTrash} aria-hidden="true" title="delete question" />
                          </Button>
                        </Form.Label>
                        <Form.Group className="mb-1" controlId={`exam-edit-question-initprompt-${idx}`}>
                          <Form.Label>Initial prompt to the bot</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder={state.defaultInitPrompt}
                            value={state.questions[idx].initPrompt}
                            onChange={(e) => dispatch({ type: 'set-question-initPrompt', questionIdx: idx, value: e.target.value })}
                          />
                          <Form.Text className="text-muted">
                            Customize the prompt used to init the discussion with the chat bot.
                          </Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-1" controlId={`exam-edit-question-question-${idx}`}>
                          <Form.Label>Question</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={4}
                            placeholder="The question asked to the student"
                            value={state.questions[idx].question}
                            onChange={(e) => dispatch({ type: 'set-question-question', questionIdx: idx, value: e.target.value })}
                            required
                          />
                        </Form.Group>
                        <Form.Group className="mb-1" controlId={`exam-edit-question-answer-${idx}`}>
                          <Form.Label>Teacher&lsquo;s answer</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={4}
                            placeholder="Your correct answer"
                            value={state.questions[idx].answer}
                            onChange={(e) => dispatch({ type: 'set-question-answer', questionIdx: idx, value: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </Form.Group>
                    ))
                  }
                  <div className="d-grid gap-2">
                    <Button
                      variant={state.validatedForm && !state.questions.length ? 'danger' : 'success'}
                      onClick={() => dispatch({ type: 'add-question' })}
                    >
                      <FontAwesomeIcon icon={faPlus} className="me-1" aria-hidden="true" title="Add question" />
                      Add question
                    </Button>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col xs={12}>
                  <h3 className="text-primary">Members</h3>
                </Col>
              </Row>
              <Row>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3" controlId="exam-edit-authors">
                    <Form.Label>Authors</Form.Label>
                    <Form.Control
                      as="textarea"
                      placeholder="author@mail.com"
                      rows={4}
                      value={state.rawAuthors}
                      onChange={(e) => dispatch({ type: 'set-raw-field', field: 'rawAuthors', value: e.target.value })}
                    />
                    <Form.Text className="text-muted">
                      Provide one username/email per line.
                      Authors will be allowed to show the exam detail
                      (except your API private keys) and access analytics
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3" controlId="exam-edit-students">
                    <Form.Label>Students</Form.Label>
                    <Form.Control
                      as="textarea"
                      placeholder="student@mail.com"
                      rows={10}
                      value={state.rawStudents}
                      onChange={(e) => dispatch({ type: 'set-raw-field', field: 'rawStudents', value: e.target.value })}
                    />
                    <Form.Text className="text-muted">
                      Provide one email per line. Student will be allowed to do the exam
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col xs={12}>
                  <h3 className="text-primary">Chat AI Used (mandatory)</h3>
                  <Row className="mb-3">
                    <Col>
                      <Form.Select
                        aria-label="Chat AI selection"
                        value={state.selectedChat.id}
                        onChange={(e) => dispatch({ type: 'set-selected-chat', value: e.target.value })}
                        required
                      >
                        <option value="">Select the chat AI</option>
                        {
                          state.availableChats.map((chat) => (
                            <option
                              key={chat.id}
                              value={chat.id}
                            >
                              {chat.title}
                            </option>
                          ))
                        }
                      </Form.Select>
                    </Col>
                  </Row>
                  {
                    state.selectedChat.id && state.selectedChat.privateKeyRequired && (
                      <Row className="mb-3">
                        <Col>
                          <Form.Group controlId="chat-pvKey">
                            <Form.Label>Chat API Key</Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="you private API key"
                              required
                              value={state.selectedChat.apiKey ?? ''}
                              onChange={(e) => dispatch({ type: 'set-chat-apiKey', value: e.target.value })}
                            />
                            <Form.Text className="text-muted">
                              Your private key will be used by all the examinee,
                              but will never be communicated to anyone
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                    )
                  }
                </Col>
              </Row>
              <Row className="justify-content-center mt-3">
                <Col xs="auto">
                  <Button type="submit" variant="success" size="lg">
                    <FontAwesomeIcon icon={faSave} className="me-1" aria-hidden="true" title="delete question" />
                    Save
                  </Button>
                </Col>
              </Row>
            </fieldset>
          </Form>
        </AdvancedLoading>
      </Col>
    </Row>
  );
}

SocratEditor.propTypes = {
  newSocrat: PropTypes.bool,
};

SocratEditor.defaultProps = {
  newSocrat: false,
};

export default observer(SocratEditor);
