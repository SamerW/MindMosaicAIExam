import PropTypes from 'prop-types';
import React from 'react';
import { Form } from 'react-bootstrap';

function AnswerInput({
  answer, onAnswerChange, required, label, controlId, className, style,
}) {
  return (
    <Form.Group controlId={controlId} className={className} style={style}>
      {
        label && (
          <Form.Label>{label}</Form.Label>
        )
      }
      <Form.Control
        as="textarea"
        cols={100}
        rows={5}
        autoComplete="off"
        spellCheck={false}
        required={required}
        value={answer ?? ''}
        onChange={(e) => onAnswerChange(e.target.value)}
      />
    </Form.Group>
  );
}

AnswerInput.propTypes = {
  answer: PropTypes.string,
  onAnswerChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  label: PropTypes.string,
  controlId: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.node,
};

AnswerInput.defaultProps = {
  answer: null,
  required: false,
  label: null,
  controlId: 'answerInputId',
  className: null,
  style: null,
};

export default AnswerInput;
