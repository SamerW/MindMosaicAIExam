import React from 'react';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
// import PropTypes from 'prop-types';
import { Col, Row } from 'react-bootstrap';
import TimeoutBox from './TimeoutBox';
import QuestionMenu from './QuestionMenu';
import ExamQuestion from './ExamQuestion';

function ExamComposition({ exam }) {
  if (!exam.currentQuestion) {
    console.warn('No current question yest!');
    return (
      <div>...</div>
    );
  }

  return (
    <>
      <Row>
        <Col xs={12} sm={3} md={3} lg="auto">
          <QuestionMenu examType="exam" exam={exam} />
        </Col>
        <Col xs={12} sm={9} md={9} lg={10}>
          <ExamQuestion question={exam.currentQuestion} chatChoices={exam.chatChoices} />
        </Col>
      </Row>
      <TimeoutBox timeoutManager={exam.timeoutManager} />
    </>
  );
}

ExamComposition.propTypes = {
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(ExamComposition);
