/* eslint no-param-reassign: ["error", { "props": false }] */
import React, { useState } from 'react';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
import {
  Alert, Col, Form, Row,
} from 'react-bootstrap';
import AnswerInput from './question/AnswerInput';
import MultiResourcePanel from './question/MultiResourcePanel';

function ExamQuestion({ question, chatChoices }) {
  const [chatRscSubmitting, setChatRscSubmitting] = useState(false);


  const submitChatAI = ({ prompt, answer, chat, image = null }) => {
    setChatRscSubmitting(true);

    question.askChatAI({ prompt, answer, chat, image })
      .finally(() => setChatRscSubmitting(false));
  };

  const addResource = ({ title, description, rscType }) => {
    setChatRscSubmitting(true);
    return question.addExternalResource({ title, description, rscType })
      .finally(() => setChatRscSubmitting(false));
  };

  const removeResource = (rscId) => {
    setChatRscSubmitting(true);
    question.deleteExternalResource(rscId)
      .finally(() => setChatRscSubmitting(false));
  };

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={12} md={12} lg={10} xl={10}>

        <Alert variant="primary" className="mb-3">
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: question.label.text }} />
        </Alert>
        <Form>
          <fieldset>
            <Row className="mb-3 justify-content-center">
              <Col xs={8}>
                <AnswerInput
                  answer={question.initAnswer}
                  onAnswerChange={(txt) => { question.initAnswer = txt; }}
                  label="Initial answerrr"
                  controlId="ExamQuestion-initialAnswer"
                />
              </Col>
            </Row>
            <Row
              className="mb-3 justify-content-center"
            >
              <Col>
                <MultiResourcePanel
                  chats={chatChoices}
                  chatActions={question.chatActions}
                  onSubmitChat={submitChatAI}
                  resources={question.resources}
                  addResource={addResource}
                  removeResource={removeResource}
                  submitting={chatRscSubmitting}
                />
              </Col>
            </Row>
            <Row className="mb-3 justify-content-center">
              <Col xs={8}>
                <AnswerInput
                  answer={question.finalAnswer}
                  onAnswerChange={(txt) => { question.finalAnswer = txt; }}
                  required
                  label="Final answer"
                  controlId="ExamQuestion-finalAnswer"
                />
              </Col>
            </Row>
          </fieldset>
        </Form>
      </Col>
    </Row>
  );
}

ExamQuestion.propTypes = {
  question: MPropTypes.objectOrObservableObject.isRequired,
  chatChoices: MPropTypes.arrayOrObservableArray.isRequired,
};

export default observer(ExamQuestion);
