import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
import { faCopy, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button, ButtonGroup, Table,
} from 'react-bootstrap';
import { openMail } from '../../../services/mailService';

function forgeMailAccessSubject(examType) {
  let entityType;
  switch (examType) {
    case 'socrat':
      entityType = 'Questionnaire';
      break;
    default:
      entityType = 'Exam';
  }
  return `${entityType} Access`;
}

function forgeMailAccessBody(examType, entityName, urlAccess) {
  let entityType;
  switch (examType) {
    case 'socrat':
      entityType = 'questionnaire';
      break;
    default:
      entityType = 'exam';
  }
  return `Dear Ms, Mss\n\nYou can now start the ${entityType} "${entityName}" through this URL: ${urlAccess}.`;
}

function ExamStudentsAccessView({ examType, exam }) {
  const [accessLoading, setAccessLoading] = useState(false);

  const loadAuthentications = () => {
    if (!accessLoading) {
      setAccessLoading(true);
      exam.generateStudentAuthentications().finally(() => {
        setAccessLoading(false);
      });
    }
  };

  const shareLinkToClipboard = (url) => {
    navigator.clipboard.writeText(url);
  };

  const shareLinkToMail = (userUrl, urlAccess) => {
    openMail(userUrl, {
      subject: forgeMailAccessSubject(examType),
      body: forgeMailAccessBody(examType, exam.name, urlAccess),
    });
  };

  if (!exam.studentAuthentications) {
    return (
      <Button variant="danger" disabled={accessLoading} onClick={loadAuthentications}>Generate and display student access URLs</Button>
    );
  }

  return (
    <Table responsive striped bordered hover size="sm" className="fittedTable">
      <thead>
        <tr>
          <th>Username</th>
          <th>Action</th>
          <th>Access URL</th>

        </tr>
      </thead>
      <tbody>
        {
          exam.studentAuthentications?.map((access) => (
            <tr key={access.username}>
              <td>{access.username}</td>
              <td>
                <ButtonGroup aria-label="User actions">
                  <Button variant="outline-secondary" onClick={() => shareLinkToClipboard(access.access_url)}>
                    <FontAwesomeIcon aria-hidden="true" icon={faCopy} title="Copy into clipboard" />
                    <span className="sr-only">
                      Copy to clipboard
                    </span>
                  </Button>
                  <Button variant="outline-secondary" onClick={() => shareLinkToMail(access.username, access.access_url)}>
                    <FontAwesomeIcon aria-hidden="true" icon={faEnvelope} title="Copy into clipboard" />
                    <span className="sr-only">
                      Send to mail
                    </span>
                  </Button>
                </ButtonGroup>
              </td>
              <td>{access.access_url}</td>
            </tr>
          ))
          }
      </tbody>
    </Table>
  );
}

ExamStudentsAccessView.propTypes = {
  examType: PropTypes.oneOf(['exam', 'socrat']).isRequired,
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(ExamStudentsAccessView);
