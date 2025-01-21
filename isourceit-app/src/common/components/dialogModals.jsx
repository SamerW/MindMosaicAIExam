import React from 'react';
// import classNames from 'classnames';
import PropTypes from 'prop-types';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

function YesNoModal({
  show, title, question, yesTitle, noTitle, onYes, onNo,
}) {
  return (
    <Modal
      show={show}
      onHide={onNo}
      backdrop="static"
      keyboard={false}
      fullscreen="md-down"
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p>{question}</p>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="primary" onClick={onYes}>{yesTitle}</Button>
        {
          onNo && (
            <Button variant="secondary" onClick={onNo}>{noTitle}</Button>
          )
        }
      </Modal.Footer>
    </Modal>
  );
}

YesNoModal.propTypes = {
  show: PropTypes.bool,
  title: PropTypes.string,
  question: PropTypes.string.isRequired,
  yesTitle: PropTypes.string,
  noTitle: PropTypes.string,
  onYes: PropTypes.func.isRequired,
  onNo: PropTypes.func,
};

YesNoModal.defaultProps = {
  show: true,
  title: 'Question',
  yesTitle: 'Oui',
  noTitle: 'Non',
  onNo: null,
};

export default YesNoModal;
