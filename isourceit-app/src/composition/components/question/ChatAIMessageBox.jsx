import { observer, PropTypes as MPropTypes } from 'mobx-react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Button, Col, Form, Modal, Row,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { ROOT_AX, ROOT_URL } from '../../../RESTInfo';
import {commentOnAnswer} from '../../model/netLayer';

function ChatAIMessageBox({ chatActions, submitting }) {
  const chatBoxRef = useRef();
  const [showModal, setShowModal] = useState(false);
  const [modalText, setModalText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);

  useEffect(() => {
    const chatMSgBox = chatBoxRef.current;
    if (chatMSgBox) {
      chatMSgBox.scrollTop = chatMSgBox.scrollHeight - chatMSgBox.clientHeight;
    }
  });

  const chatMessages = chatActions
    .flatMap((act) => (act.answer
      ? [{ k: `prompt-${act.id}`, v: act.prompt }, { k: `ans-${act.id}`, v: act.answer, a: true }]
      : [{ k: `prompt-${act.id}`, v: act.prompt }]));

      const handleSend = async () => {
        if (!modalText.trim()) {
          alert('Message cannot be empty!');
          return;
        }
      
        if (!selectedMessageId) {
          alert('No message selected!');
          return;
        }
      
        setIsSending(true);
      
        try {
          // Call the commentOnAnswer function
          const data = await commentOnAnswer({
            questionId: selectedMessageId,
            comment: modalText,
          });
      
          setModalText(''); // Clear the textarea
          setSelectedMessageId(null); // Reset the selected message ID
          setShowModal(false); // Close the modal
        } catch (error) {
          console.error('Error sending comment:', error);
          alert('Failed to send the comment. Please try again.');
        } finally {
          setIsSending(false);
        }
      };

  const openModal = (messageId) => {
    setSelectedMessageId(messageId); // Store the selected message ID
    setShowModal(true);
  };

  return (
    <>
      <Row
        className={classNames('border', 'border-dark-subtle', 'overflow-auto')}
        style={{
          minHeight: '20vh',
          maxHeight: '50vh',
        }}
        ref={chatBoxRef}
      >
        <Col>
          {
            chatMessages.map((msg) => (
              <Row key={msg.k} className={classNames({ 'justify-content-end': msg.a })}>
                <Col xs={7}>
                  <div className="d-flex align-items-center">
                
                  {msg.a && (
                      <Button
                        variant="secondary"
                        className="me-2"
                        size="sm"
                        onClick={() => openModal(msg.k)}

                      >
                        Your comment
                      </Button>
                    )}
                    
                    <Alert variant={msg.a ? 'success' : 'primary'} className="flex-grow-1">
                      <p className="m-0" style={{ whiteSpace: 'pre-line' }}>{msg.v}</p>
                    </Alert>
                  </div>
                </Col>
              </Row>
            ))
          }
          {
            submitting && (
              <Row className="justify-content-center" style={{ height: '2rem' }}>
                <Col xs="auto">
                  <FontAwesomeIcon icon={faSpinner} className={classNames('text-secondary-emphasis')} spinPulse size="xl" />
                </Col>
              </Row>
            )
          }
        </Col>
      </Row>

      {/* Modal Definition */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Enter your comment about the given answer ?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="modalTextarea">
            <Form.Label>Your comment</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              placeholder="Write your comment here..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

ChatAIMessageBox.propTypes = {
  chatActions: MPropTypes.arrayOrObservableArray.isRequired,
  submitting: PropTypes.bool,
};

ChatAIMessageBox.defaultProps = {
  submitting: false,
};

export default observer(ChatAIMessageBox);
