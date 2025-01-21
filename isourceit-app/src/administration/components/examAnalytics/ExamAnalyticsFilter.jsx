import { observer, PropTypes as MPropTypes } from 'mobx-react';
import React from 'react';
import PropTypes from 'prop-types';
import { Col, Form, Row } from 'react-bootstrap';
import classNames from 'classnames';

function limitQuestionSize(q, maxSize = 45, postfix = '...') {
  if (q && q.length && q.length > maxSize) {
    return `${q.substring(0, maxSize - postfix.length)}${postfix}`;
  }
  return q;
}

function ExamAnalyticsFilter({
  examType, students, questions, selectedStudentUsername, selectedQuestionIdx,
  onSelectStudentUsername, onSelectQuestionIdx, disabled, className, style,
}) {
  const selectStudent = (e) => {
    const username = e.target.value;
    if (username) {
      onSelectStudentUsername(username);
    } else {
      onSelectStudentUsername(null);
    }
  };

  const selectQuestion = (e) => {
    const questionIdx = Number(e.target.value);
    if (questionIdx >= 0 && questionIdx < questions.length) {
      onSelectQuestionIdx(questionIdx);
    } else {
      onSelectQuestionIdx(null);
    }
  };

  return (
    <Row className={classNames('justify-content-around', className)} style={style}>
      <Col>
        <Form.Select
          aria-label="Select student"
          required
          onChange={selectStudent}
          value={selectedStudentUsername ?? ''}
          disabled={disabled}
        >
          <option value="">Please select a student</option>
          {
            students.map((student) => (
              <option key={student.username} value={student.username}>{student.username}</option>
            ))
          }
        </Form.Select>
      </Col>
      <Col>
        <Form.Select
          aria-label="Select question"
          onChange={selectQuestion}
          value={selectedQuestionIdx ?? '-1'}
          disabled={disabled}
        >
          <option value="-1">All questions</option>
          {
            questions.map((question, idx) => (
              <option key={question.text} value={idx}>
                {limitQuestionSize(question.text)}
              </option>
            ))
          }
        </Form.Select>
      </Col>
    </Row>
  );
}

ExamAnalyticsFilter.propTypes = {
  examType: PropTypes.oneOf(['exam', 'socrat']).isRequired,
  students: MPropTypes.arrayOrObservableArray.isRequired,
  questions: MPropTypes.arrayOrObservableArray.isRequired,
  selectedStudentUsername: PropTypes.string,
  selectedQuestionIdx: PropTypes.number,
  onSelectStudentUsername: PropTypes.func.isRequired,
  onSelectQuestionIdx: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.node,
  style: PropTypes.node,
};

ExamAnalyticsFilter.defaultProps = {
  selectedStudentUsername: null,
  selectedQuestionIdx: null,
  disabled: false,
  className: null,
  style: null,
};

export default observer(ExamAnalyticsFilter);
