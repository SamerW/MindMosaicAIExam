import { observer } from 'mobx-react';
import React, {
  useContext, useEffect, useReducer,
} from 'react';
import PropTypes from 'prop-types';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button, Col, Row } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBackward, faRepeat } from '@fortawesome/free-solid-svg-icons';
import ExamMgmtStore from '../ExamMgmtStore';
import ExamAnalyticsFilter from './ExamAnalyticsFilter';
import { AdvancedLoading } from '../../../common/components/Loading';
import ExamAnalyticsTimeLine from './ExamAnalyticsTimeLine';

function initState() {
  return {
    studentUsername: null,
    questionIdx: null,
    analyzedActions: null,
    loadingActions: false,
    forceLoad: false,
  };
}

function reduce(state, action) {
  switch (action.type) {
    case 'set-student':
      return { ...state, studentUsername: action.value, loadingActions: true };
    case 'set-question':
      return { ...state, questionIdx: action.value, loadingActions: true };
    case 'set-actions':
      return {
        ...state, analyzedActions: action.value, loadingActions: false, forceLoad: false,
      };
    case 'set-force-reload':
      return { ...state, loadingActions: true, forceLoad: true };
    default:
      throw new Error(`Illegal action type ${action.type}.`);
  }
}

function ExamAnalytics({ examType }) {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const { manager } = useContext(ExamMgmtStore);
  const [state, dispatch] = useReducer(reduce, initState());

  useEffect(() => {
    // Ensure detail are loade the positionate
    let dePromise;
    switch (examType) {
      case 'exam':
        dePromise = manager.loadDetailedExam({ examId });
        break;
      case 'socrat':
        dePromise = manager.loadDetailedSocrat({ examId });
        break;
      default:
        throw new Error(`Unmanageable exam type: ${examType}`);
    }
    dePromise.then(() => {
      // if a username search params was initially given, set the state
      const uname = searchParams.get('username');
      if (uname) {
        dispatch({ type: 'set-student', value: uname });
      }
    });
  }, [examType, examId, manager]);

  // Reload / filter actions to analyzed if asked (state.loadingActions becomes true)
  useEffect(() => {
    if (!state.loadingActions) {
      return;
    }
    if (!state.studentUsername) {
      // no user selectionned, no actions
      dispatch({ type: 'set-actions', value: null });
      return;
    }
    // find the proper student
    const student = manager.currentExam?.students
      ?.find((s) => s.username === state.studentUsername);
    if (!student) {
      // student not found, set no actions
      dispatch({ type: 'set-actions', value: null });
      return;
    }
    // Ask to load actions (if required)
    student.loadActions(!!state.forceLoad).then((actions) => {
      // If no question set, set these actions, filter them otherwise
      if (state.questionIdx === null) {
        dispatch({ type: 'set-actions', value: actions });
      } else {
        dispatch({ type: 'set-actions', value: actions.filter((act) => act.question_idx === state.questionIdx) });
      }
    });
  }, [state.loadingActions]);

  const exam = manager.currentExam;

  return (
    <Row className="justify-content-center">
      <Col xs={12} lg={10}>
        <AdvancedLoading
          loading={manager.loading}
          loadingError={manager.loadingError}
        >
          {
            exam && (
              <>
                <Row className="mb-3">
                  <Col xs="auto">
                    <h4 className="text-primary">
                      <Button as={Link} to={-1} variant="outline-primary" className="me-2" size="sm">
                        <FontAwesomeIcon aria-hidden="true" icon={faBackward} title="asked access" />
                      </Button>
                      {exam.name}
                      {' '}
                      - Analytics
                    </h4>
                  </Col>
                </Row>
                <ExamAnalyticsFilter
                  examType={examType}
                  students={exam.students}
                  questions={exam.questions}
                  selectedStudentUsername={state.studentUsername}
                  selectedQuestionIdx={state.questionIdx}
                  onSelectStudentUsername={(uname) => dispatch({ type: 'set-student', value: uname })}
                  onSelectQuestionIdx={(qidx) => dispatch({ type: 'set-question', value: qidx })}
                  disabled={state.loadingActions}
                  className="mb-3"
                />
                <Row className="mb-3">
                  <Col xs="auto">
                    <Button
                      variant="outline-success"
                      size="sm"
                      disabled={state.loadingActions || !state.analyzedActions}
                      onClick={() => dispatch({ type: 'set-force-reload' })}
                    >
                      <FontAwesomeIcon aria-hidden="true" icon={faRepeat} title="asked access" className="me-2" />
                      Refresh actions
                    </Button>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col xs={12}>
                    <ExamAnalyticsTimeLine
                      actions={state.analyzedActions}
                      loadingActions={state.loadingActions}
                    />
                  </Col>
                </Row>
              </>
            )
          }
        </AdvancedLoading>
      </Col>
    </Row>
  );
}

ExamAnalytics.propTypes = {
  examType: PropTypes.oneOf(['exam', 'socrat']).isRequired,
};

export default observer(ExamAnalytics);
