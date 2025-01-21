import React from 'react';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
// import PropTypes from 'prop-types';
import { Alert, Col, Row } from 'react-bootstrap';

function ExamEnded({ exam }) {
  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={8} lg={6}>
        <Alert variant="success">
          <Alert.Heading>{exam.name}</Alert.Heading>
          <p>
            You have finished the exam. Well done (maybe)!
          </p>
        </Alert>
      </Col>
    </Row>
  );
}

ExamEnded.propTypes = {
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(ExamEnded);
