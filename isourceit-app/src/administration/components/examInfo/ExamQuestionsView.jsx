import { observer, PropTypes as MPropTypes } from 'mobx-react';
import PropTypes from 'prop-types';
import React from 'react';
import { ListGroup } from 'react-bootstrap';

const ExamQuestion = observer(({ question }) => (
  /* eslint-disable-next-line react/no-danger */
  <div dangerouslySetInnerHTML={{ __html: question }} />
));

const SocratQuestion = observer(({ question }) => (
  <ul>
    <li>
      <u>Question:</u>
      &nbsp;
      {question.question}
    </li>
    <li>
      <u>Answer:</u>
      &nbsp;
      {question.answer}
    </li>
    {
      question.init_prompt && (
        <li>
          <u>Init prompt:</u>
          &nbsp;
          {question.init_prompt}
        </li>
      )
    }
  </ul>
));

function ExamQuestionsView({ examType, exam }) {
  let QuestionComponent;
  switch (examType) {
    case 'exam':
      QuestionComponent = ExamQuestion;
      break;
    case 'socrat':
      QuestionComponent = SocratQuestion;
      break;
    default:
      throw new Error(`Unmanageable examType: ${examType}`);
  }

  return (
    <ListGroup>
      {
        exam.questions?.map((question, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <ListGroup.Item key={idx}>
            <QuestionComponent question={question.text} />
          </ListGroup.Item>
        ))
        }
    </ListGroup>
  );
}

ExamQuestionsView.propTypes = {
  examType: PropTypes.oneOf(['exam', 'socrat']).isRequired,
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(ExamQuestionsView);
