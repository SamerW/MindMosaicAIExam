import React from 'react';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
// import PropTypes from 'prop-types';
import {
  Alert, Button, Col, Row,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBackward, faCheckToSlot } from '@fortawesome/free-solid-svg-icons';

function getQuestionLabelExtract(label, maxSize = 100) {
  if (!label || label.length < maxSize) {
    return label;
  }
  return `${label.substring(0, maxSize - 3)}...`;
}

function SocratSubmit({ socrat }) {
  const unansweredQuestions = socrat.questions
    .map((q, idx) => [idx + 1, q])
    .filter((fullQ) => !fullQ[1].finalAnswer);

  const hasAnyUnansQuestions = unansweredQuestions.length > 0;

  const submitSocrat = () => {
    socrat.submitSocrat();
  };

  const rollback = () => {
    socrat.rollbackOnSubmit();
  };

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={8} lg={6}>
        <Alert variant="primary">
          <Alert.Heading>Questionnaire Submission</Alert.Heading>
          <p>
            You are goind to sumbit this questionnaire. Once done, you will not be able to edit any
            of your answer anymore.
          </p>
        </Alert>
        {
          hasAnyUnansQuestions && (
            <Alert variant="warning">
              <Alert.Heading>Unanswered questions</Alert.Heading>
              <p>
                You have some question left unanswered. Please verify this is intended.
              </p>
              <ul>
                {
                  unansweredQuestions.map(([idx, question]) => (
                    <li key={question.id}>
                      Q
                      {idx}
                      :&nbsp;
                      {getQuestionLabelExtract(question.label)}
                    </li>
                  ))
                }
              </ul>
            </Alert>
          )
        }
        <Row className="justify-content-between">
          <Col xs="auto">
            <Button onClick={rollback} variant="primary" size="lg">
              <FontAwesomeIcon
                icon={faBackward}
                aria-hidden="true"
                title="Get back to composition"
                className="me-2"
              />
              Get back to composition
            </Button>
          </Col>
          <Col xs="auto">
            <Button onClick={submitSocrat} variant="danger" size="lg">
              <FontAwesomeIcon
                icon={faCheckToSlot}
                aria-hidden="true"
                title="Submit your proposition"
                className="me-2"
              />
              Submit your answers
            </Button>
          </Col>
        </Row>
      </Col>
    </Row>
  );
}

SocratSubmit.propTypes = {
  socrat: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(SocratSubmit);
