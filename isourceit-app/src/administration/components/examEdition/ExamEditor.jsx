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
    selectedChats: [],
    selectedSearchEngines: [],
    validatedForm: false,
  };
}

function computeSelectedChats(availableChats, examSelectedChats = null) {
  return availableChats.map((chat) => {
    const chatSelector = { ...chat };
    const selectedChat = examSelectedChats ? examSelectedChats[chatSelector.id] : null;
    chatSelector.selected = !!selectedChat;
    if (chatSelector.selected && chatSelector.privateKeyRequired) {
      chatSelector.apiKey = selectedChat.api_key;
    }
    return chatSelector;
  });
}

function computeSelectedSearchEngines(availableSearchEngines, examSelectedSearchEngines = null) {
  return availableSearchEngines.map((engine) => {
    const engineSelector = { ...engine };
    const selectedEngine = examSelectedSearchEngines ? examSelectedSearchEngines[engineSelector.id] : null;
    engineSelector.selected = !!selectedEngine;
    if (engineSelector.selected && engineSelector.privateKeyRequired) {
      engineSelector.apiKey = selectedEngine.api_key;
    }
    return engineSelector;
  });
}

function reduce(state, action) {
  switch (action.type) {
    case 'set-loading':
      return { ...state, loading: true };
    case 'set-for-creation':
      return {
        ...initState(),
        loading: false,
        selectedChats: computeSelectedChats(action.availableChats),
        selectedSearchEngines: computeSelectedSearchEngines(action.availableSearchEngines),
      };
    case 'set-for-edition': {
      const { exam, availableChats, availableSearchEngines } = action;
      return {
        ...state,
        loading: false,
        name: exam.name,
        description: exam.description,
        questions: exam.questions?.length
          ? exam.questions.map((q) => ({ text: q, extraNotes: '' }))
          : [],
        durationMinutes: exam.durationMinutes,
        rawAuthors: exam.authors.map((a) => a.username).join('\n'),
        rawStudents: exam.students.map((s) => s.username).join('\n'),
        selectedChats: computeSelectedChats(availableChats, exam.selectedChats),
        selectedSearchEngines: computeSelectedSearchEngines(availableSearchEngines, exam.selectedSearchEngines)
      };
    }
    case 'set-raw-field':
      return { ...state, [action.field]: action.value };
    case 'set-duration':
      return { ...state, durationMinutes: Number(action.value) };
    case 'add-question':
      return {
        ...state,
        questions: [...state.questions, { text: '', extraNotes: '' }],
      };
    case 'set-question':
      return {
        ...state,
        questions: [
          ...state.questions.slice(0, action.questionIdx),
          { ...state.questions[action.questionIdx], text: action.value },
          ...state.questions.slice(action.questionIdx + 1),
        ],
      };
    case 'set-extra-notes':
      return {
        ...state,
        questions: [
          ...state.questions.slice(0, action.questionIdx),
          { ...state.questions[action.questionIdx], extraNotes: action.value },
          ...state.questions.slice(action.questionIdx + 1),
        ],
      };
    case 'delete-question':
      return {
        ...state,
        questions: state.questions.filter((_, idx) => idx !== action.questionIdx),
      };
    case 'switch-selected-chat':
      return {
        ...state,
        selectedChats: [
          ...state.selectedChats.slice(0, action.chatIdx),
          {
            ...state.selectedChats[action.chatIdx],
            selected: !state.selectedChats[action.chatIdx].selected,
          },
          ...state.selectedChats.slice(action.chatIdx + 1),
        ],
      };
    case 'set-chat-apiKey':
      return {
        ...state,
        selectedChats: [
          ...state.selectedChats.slice(0, action.chatIdx),
          {
            ...state.selectedChats[action.chatIdx],
            apiKey: action.value,
          },
          ...state.selectedChats.slice(action.chatIdx + 1),
        ],
      };
      case 'switch-selected-search-engine':
      return {
        ...state,
        selectedSearchEngines: [
          ...state.selectedSearchEngines.slice(0, action.engineIdx),
          {
            ...state.selectedSearchEngines[action.engineIdx],
            selected: !state.selectedSearchEngines[action.engineIdx].selected,
          },
          ...state.selectedSearchEngines.slice(action.engineIdx + 1),
        ],
      };
    case 'set-search-engine-apiKey':
      return {
        ...state,
        selectedSearchEngines: [
          ...state.selectedSearchEngines.slice(0, action.engineIdx),
          {
            ...state.selectedSearchEngines[action.engineIdx],
            apiKey: action.value,
          },
          ...state.selectedSearchEngines.slice(action.engineIdx + 1),
        ],
      };
    case 'set-saving':
      return { ...state, saving: action.value };
    case 'set-validated-form':
      return { ...state, validatedForm: action.value };
    default:
      throw new Error(`Illegal action type ${action.type}.`);
  }
}


function computeExamJsonFromState(state, examId) {
  const jsonRep = {
    name: state.name.trim(),
    description: state.description.trim(),
    questions: state.questions.map((q) => ({
      text: q.text.trim(),
      prompt_intruction: q.extraNotes.trim(),
    })),
    duration_minutes: state.durationMinutes,
    authors: state.rawAuthors.split('\n')
      .map((a) => a.trim()).filter((a) => !!a)
      .map((a) => ({ username: a })),
    students: state.rawStudents.split('\n')
      .map((a) => a.trim()).filter((a) => !!a)
      .map((a) => ({ username: a })),
    selected_chats: state.selectedChats.filter((c) => c.selected)
      .map((c) => [c.id, c.apiKey ? { api_key: c.apiKey } : {}])
      .reduce((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {}),
    selected_search_engines: state.selectedSearchEngines.filter((c) => c.selected)
      .map((c) => [c.id, c.apiKey ? { api_key: c.apiKey } : {}])
      .reduce((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {}),
  };
  if (examId) {
    jsonRep.id = examId;
  }
  return jsonRep;
}


function ExamEditor({ newExam }) {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { manager } = useContext(ExamMgmtStore);
  const [state, dispatch] = useReducer(reduce, initState());

  useEffect(() => {
    dispatch({ type: 'set-loading' });
    if (newExam && !examId) {
      Promise.all([
        manager.loadAvailableChats(),
        manager.loadAvailableSearchEngines()
      ]).then(([availableChats, availableSearchEngines]) =>
        dispatch({ type: 'set-for-creation', availableChats, availableSearchEngines })
      );
      

    } else if (!newExam && examId) {
      Promise.all([
        manager.loadAvailableChats(),
        manager.loadAvailableSearchEngines(),
        manager.loadDetailedExam({ examId }),
      ]).then(([availableChats, exam]) => dispatch({ type: 'set-for-edition', exam, availableChats, availableSearchEngines }));
    } else {
      console.warn(`Illegal state for exam creation. NewExam: ${newExam} | examId: ${examId}`);
    }
  }, [manager, newExam, examId]);

  const submit = (e) => {
    e.preventDefault();

    // Check form validaty
    const form = e.currentTarget;
    const formValidity = form.checkValidity();
    // Check state validaty
    const stateValidity = !!(state.name && state.description
      && state.questions.length > 0
      && state.questions.every((q) => !!q)
      && state.durationMinutes > 0);
    // Set validated
    dispatch({ type: 'set-validated-form', value: true });
    // If validation failed, stop here
    if (formValidity === false || stateValidity === false) {
      e.stopPropagation();
      return;
    }

    const jsonRep = computeExamJsonFromState(state, examId);
    dispatch({ type: 'set-saving', value: true });
    manager.saveExam(jsonRep).then(() => {
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
                      placeholder="Your exam name"
                      value={state.name}
                      onChange={(e) => dispatch({ type: 'set-raw-field', field: 'name', value: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="exam-edit-duration">
                    <Form.Label>Duration in minutes</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="60"
                      min="1"
                      step="1"
                      value={state.durationMinutes}
                      onChange={(e) => dispatch({ type: 'set-duration', value: e.target.value })}
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
                  <h3 className="text-primary">Question</h3>
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
                      <RichTextEditor
                        value={state.questions[idx].text}
                        onChange={(value) => dispatch({ type: 'set-question', questionIdx: idx, value })}
                        placeholder="Your Question"
                        required
                        validated={state.validatedForm}
                      />
                      <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Additional notes for this question"
                        value={state.questions[idx].extraNotes}
                        onChange={(e) =>
                          dispatch({ type: 'set-extra-notes', questionIdx: idx, value: e.target.value })
                        }
                        className="mt-2"
                      />
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
                  <h3 className="text-primary">Chat AI Allowed</h3>
                  {
                    state.selectedChats.map((choice, idx) => (
                      <Row key={choice.id} className="mb-3">
                        <Col xs="auto">
                          <Form.Check
                            type="switch"
                            id={`chat-choice-${choice.id}`}
                            label={choice.title}
                            checked={choice.selected}
                            onChange={() => dispatch({ type: 'switch-selected-chat', chatIdx: idx })}
                          />
                        </Col>
                        {
                          choice.selected && choice.privateKeyRequired && (
                            <Col xs="auto">
                              <Form.Group controlId={`chat-choice-${choice.id}-pvKey`}>
                                <Form.Label>Chat API Key</Form.Label>
                                <Form.Control
                                  type="text"
                                  placeholder="you private API key"
                                  required
                                  value={choice.apiKey ?? ''}
                                  onChange={(e) => dispatch({ type: 'set-chat-apiKey', chatIdx: idx, value: e.target.value })}
                                />
                                <Form.Text className="text-muted">
                                  Your private key will be used by all the examinee,
                                  but will never be communicated to anyone
                                </Form.Text>
                              </Form.Group>
                            </Col>
                          )
                        }
                      </Row>
                    ))
                  }
                </Col>
              </Row>
              <Row>
                <Col xs={12}>
                  <h3 className="text-primary">Search Engines Allowed</h3>
                  {(state.selectedSearchEngines || []).map((engine, idx) => (
                    <Row key={engine.id} className="mb-3">
                      <Col xs="auto">
                        <Form.Check
                          type="switch"
                          id={`search-engine-${engine.id}`}
                          label={engine.title}
                          checked={engine.selected}
                          onChange={() => dispatch({ type: 'switch-selected-search-engine', engineIdx: idx })}
                        />
                      </Col>
                      {
                          engine.selected && engine.privateKeyRequired && (
                            <Col xs="auto">
                              <Form.Group controlId={`search-engine-${engine.id}-pvKey`}>
                                <Form.Label>Search API Key</Form.Label>
                                <Form.Control
                                  type="text"
                                  placeholder="you private API key"
                                  required
                                  value={engine.apiKey ?? ''}
                                  onChange={(e) => dispatch({ type: 'set-search-engine-apiKey', engineIdx: idx, value: e.target.value })}
                                />
                                <Form.Text className="text-muted">
                                  Your private key will be used by all the examinee,
                                  but will never be communicated to anyone
                                </Form.Text>
                              </Form.Group>
                            </Col>
                          )
                        }
                    </Row>
                  ))}
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

ExamEditor.propTypes = {
  newExam: PropTypes.bool,
};

ExamEditor.defaultProps = {
  newExam: false,
};

export default observer(ExamEditor);
