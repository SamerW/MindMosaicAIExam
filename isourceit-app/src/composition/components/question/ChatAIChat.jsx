import { observer, PropTypes as MPropTypes } from 'mobx-react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import {
  Button, Col, Form, InputGroup, Row,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import ChatAIMessageBox from './ChatAIMessageBox';

import styleApp from './ChatAIChat.scss';

function ChatAIChat({
  chatActions, onSubmit, submitting, chatId, className, style,
}) {
  const [prompt, setPrompt] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageName, setImageName] = useState('');

  const submitPrompt = () => {
    const correctedPrompt = prompt?.trim();
    const payload = {
      prompt: correctedPrompt || null,
      image: imageBase64 || null,
    };

    // Ensure at least one of the fields is populated
    if (payload.prompt || payload.image) {
      onSubmit(payload);
      setPrompt(''); // Clear prompt
      setImageBase64(''); // Clear image
      setImageName(''); // Clear image name
    }
  };

  const handleImageAttach = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageName(file.name); // Store the image name
      const reader = new FileReader();
      reader.onload = () => {
        setImageBase64(reader.result); // Store the image as a base64 string
      };
      reader.readAsDataURL(file);
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
              aria-describedby="champ-prompt"
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
          <Row className="align-items-center mt-2">
            <Col>
              <Form.Group>
                <Form.Label htmlFor={`file-input-${chatId}`} style={{ cursor: 'pointer', marginRight: '10px' }}>
                  <FontAwesomeIcon icon={faPaperclip} size="sm" /> Attach Image
                </Form.Label>
                <Form.Control
                  type="file"
                  id={`file-input-${chatId}`}
                  style={{ display: 'none' }}
                  onChange={handleImageAttach}
                  accept="image/*" // Allow only image files
                />
                {imageName && <small className="text-muted ml-2">{imageName}</small>}
              </Form.Group>
            </Col>
            <Col xs="auto">
              <Button
                variant="outline-secondary"
                id={`chat-prompt-send-button-${chatId}`}
                type="button"
                onClick={submitPrompt}
                disabled={submitting || pendingAction}
              >
                <FontAwesomeIcon icon={faPaperPlane} size="sm" /> Send
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
}

ChatAIChat.propTypes = {
  chatActions: MPropTypes.arrayOrObservableArray.isRequired,
  onSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  chatId: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.string,
};

ChatAIChat.defaultProps = {
  submitting: false,
  chatId: null,
  className: null,
  style: null,
};

export default observer(ChatAIChat);
