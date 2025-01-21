import { observer, PropTypes as MPropTypes } from 'mobx-react';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import {
  Button, Form, InputGroup, OverlayTrigger, Tooltip,
} from 'react-bootstrap';

function ExamInfoView({ examType, exam }) {
  const [showSharedLinkTooltip, setShowSharedLinkTooltip] = useState(false);

  const shareLinkToClipboard = () => {
    navigator.clipboard.writeText(exam.generationAuthUrl).then(() => {
      setShowSharedLinkTooltip(true);
    });
  };

  const onToogleTooltip = () => {
    setTimeout(() => setShowSharedLinkTooltip(false), 1000);
  };

  return (
    <>
      <Form.Label htmlFor="student-link"><u>Student Access link</u></Form.Label>
      <InputGroup>
        <Form.Control
          id="student-link"
          aria-describedby="share-student-link"
          type="url"
          disabled
          value={exam.generationAuthUrl}
        />
        <OverlayTrigger
          trigger="click"
          placement="right"
          show={showSharedLinkTooltip}
          onToggle={onToogleTooltip}
          overlay={(<Tooltip id="shared-link-tooltip">Copied!</Tooltip>)}
        >
          <Button variant="outline-secondary" id="share-student-link" onClick={shareLinkToClipboard}>
            Share
          </Button>
        </OverlayTrigger>

      </InputGroup>
      <p className="mt-3">
        <u>Description:</u>
      </p>
      {/* eslint-disable-next-line react/no-danger */}
      <div className="border border-1 p-1 mt-1" dangerouslySetInnerHTML={{ __html: exam.description }} />
      <ul className="list-unstyled">
        {
          examType === 'exam' && (
            <li className="mt-3">
              <u>Duration (minutes):</u>
              {' '}
              {exam.durationMinutes}
            </li>
          )
        }
        <li className="mt-3">
          <u>Authors:</u>
          <ul className="list-unstyled mx-3">
            {
            exam.authors?.map(((author) => (
              <li key={author.username}>{author.username}</li>
            )))
            }
          </ul>
        </li>
      </ul>
    </>
  );
}

ExamInfoView.propTypes = {
  examType: PropTypes.oneOf(['exam', 'socrat']).isRequired,
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(ExamInfoView);
