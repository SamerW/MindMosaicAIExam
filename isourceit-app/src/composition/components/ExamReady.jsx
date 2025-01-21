import React, { useState } from 'react';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
// import PropTypes from 'prop-types';
import {
  Alert, Button, Col, Row,
} from 'react-bootstrap';

function formatDuration(durationMinutes) {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes - hours * 60;
  let str = '';
  if (hours) {
    str = `${hours} hour`;
    if (hours > 1) {
      str += 's';
    }
  }

  if (minutes) {
    if (str) {
      str += ' ';
    }
    str += `${minutes} minute`;
    if (minutes > 1) {
      str += 's';
    }
  }
  return str;
}

function ExamReady({ exam }) {
  const [disabled, setDisabled] = useState(false);

  const startExam = () => {
    setDisabled(true);
    exam.startExam().catch(() => setDisabled(false));
  };

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={8} lg={6}>
        <Alert variant="primary">
          <Alert.Heading>{exam.name}</Alert.Heading>
          <hr />
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: exam.description }} />
          <hr />
          <p className="mb-0">
            This exam includes
            {' '}
            {exam.nbQuestions}
            {' '}
            question
            {exam.nbQuestions > 1 ? 's' : ''}
            .
            You will have
            {' '}
            {formatDuration(exam.durationMinutes)}
            {' '}
            to complete this exam.
          </p>
        </Alert>
        <div className="d-grid gap-2">
          <Button variant="success" size="lg" onClick={startExam} disabled={disabled}>
            Start the Exam
          </Button>
        </div>
      </Col>
    </Row>
  );
}

ExamReady.propTypes = {
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(ExamReady);
