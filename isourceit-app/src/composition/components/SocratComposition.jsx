import React from 'react';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
// import PropTypes from 'prop-types';
import { Col, Row } from 'react-bootstrap';
import QuestionMenu from './QuestionMenu';
import SocratQuestion from './SocratQuestion';

function SocratComposition({ exam }) {
  if (!exam.currentQuestion) {
    console.warn('No current question yest!');
    return (
      <div>...</div>
    );
  }

  return (
    <Row>
      <Col xs={12} sm={3} md={3} lg="auto">
        <QuestionMenu examType="socrat" exam={exam} />
      </Col>
      <Col xs={12} sm={9} md={9} lg={10}>
        <SocratQuestion question={exam.currentQuestion} chatChoices={exam.chatChoices} />
      </Col>
    </Row>
  );
}

SocratComposition.propTypes = {
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(SocratComposition);
