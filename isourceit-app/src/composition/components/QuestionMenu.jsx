import React from 'react';
import PropTypes from 'prop-types';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
import { Button, Col, Row } from 'react-bootstrap';
import classNames from 'classnames';

function getButtonVariant(question) {
  if (question.finalAnswer) {
    return 'outline-success';
  }
  if (question.initAnswer || question.chatActions?.length || question.resources?.length) {
    return 'outline-warning';
  }
  return 'outline-danger';
}

function QuestionMenu({ examType, exam }) {
  let submitText;
  switch (examType) {
    case 'socrat':
      submitText = 'Submit questionnaire';
      break;
    case 'exam':
    default:
      submitText = 'Submit exam';
  }

  return (
    <Row className="border-end border-dark border-3 h-100">
      <Col>
        <h4><u>Questions</u></h4>
        <div className="d-grid gap-2">
          {
            exam.questions?.map((question, idx) => (
              <Button
                key={question.id}
                variant={getButtonVariant(question, exam.currentQuestion)}
                className={classNames('mb-0', { 'text-decoration-underline': question === exam.currentQuestion && !exam.onSubmit })}
                onClick={() => exam.changeQuestion(question.id)}
              >
                {`Question ${idx + 1}`}
              </Button>
            ))
          }
          <Button variant="primary" className="mt-5" onClick={() => exam.goOnSubmit()}>
            {submitText}
          </Button>
        </div>
      </Col>
    </Row>
  );
}

QuestionMenu.propTypes = {
  examType: PropTypes.string.isRequired,
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(QuestionMenu);
