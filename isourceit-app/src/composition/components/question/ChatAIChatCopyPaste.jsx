import { observer, PropTypes as MPropTypes } from 'mobx-react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import {
  Button, Col, Form, InputGroup, Row,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import ChatAIMessageBox from './ChatAIMessageBox';

import styleApp from './ChatAIChatCopyPaste.scss';

function ChatAIChatCopyPaste({
  chatActions, onSubmit, submitting, chatId, className, style,
}) {
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');

  const submitPrompt = () => {
    const correctedPrompt = prompt?.trim();
    const correctedAnswer = answer?.trim();
    if (correctedPrompt && correctedAnswer) {
      onSubmit({ prompt: correctedPrompt, answer: correctedAnswer });
      setPrompt('');
      setAnswer('');
    }
  };

  const pendingAction = !!(chatActions.length && chatActions[chatActions.length - 1].pending);

  return (
    <div className={className} style={style}>
      <ChatAIMessageBox chatActions={chatActions} submitting={submitting || pendingAction} />
      <Row className={classNames('border', 'border-dark-subtle')}>
        <Col className="px-0">
          <InputGroup className={styleApp.chatAIInput}>
            <Form.Control
              placeholder="Your prompt"
              aria-label="Chat prompt"
              aria-describedby="champt-prompt"
              as="textarea"
              rows={3}
              autoComplete="off"
              spellCheck={false}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="px-1"
              disabled={submitting || pendingAction}
            />
          </InputGroup>
          <InputGroup className={styleApp.chatAIInput}>
            <Form.Control
              placeholder="The IA answer"
              aria-label="IA answer"
              aria-describedby="chat-answer"
              as="textarea"
              rows={3}
              autoComplete="off"
              spellCheck={false}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="px-1"
              disabled={submitting || pendingAction}
            />
          </InputGroup>
          <div className="d-grid gap-2">
            <Button
              variant="outline-secondary"
              id={`chat-prompt-send-button-${chatId}`}
              type="button"
              onClick={submitPrompt}
              disabled={submitting || pendingAction}
            >
              <FontAwesomeIcon icon={faPaperPlane} size="sm" />
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
}

ChatAIChatCopyPaste.propTypes = {
  chatActions: MPropTypes.arrayOrObservableArray.isRequired,
  onSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  chatId: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.string,
};

ChatAIChatCopyPaste.defaultProps = {
  submitting: false,
  chatId: null,
  className: null,
  style: null,
};

export default observer(ChatAIChatCopyPaste);
