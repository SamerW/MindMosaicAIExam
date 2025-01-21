import { observer, PropTypes as MPropTypes } from 'mobx-react';
import React from 'react';
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

function ExamStudentsView({ exam }) {
  return (
    <Table responsive striped bordered hover size="sm" className="fittedTable">
      <thead>
        <tr>
          <th>Username</th>
          <th>Asked access</th>
          <th>Started</th>
          <th># actions</th>
          <th>Exam ended</th>
          <th>Has submited</th>
        </tr>
      </thead>
      <tbody>
        {
          exam.students?.map((student) => (
            <tr key={student.username}>
              <td><Link to={`analytics?username=${student.username}`}>{student.username}</Link></td>
              <td>
                {
                  student.askedAccess ? (
                    <FontAwesomeIcon aria-hidden="true" icon={faCheck} title="asked access" className="text-success" />
                  ) : (
                    <FontAwesomeIcon aria-hidden="true" icon={faXmark} title="did not ask access" className="text-danger" />
                  )
                }
              </td>
              <td>{student.formatedFirstTimestamp}</td>
              <td>{student.nbActions}</td>
              <td>
                {
                  student.endedExam ? (
                    <FontAwesomeIcon aria-hidden="true" icon={faCheck} title="asked access" />
                  ) : (
                    <FontAwesomeIcon aria-hidden="true" icon={faXmark} title="did not ask access" />
                  )
                }
              </td>
              <td>
                {
                  student.submitted ? (
                    <FontAwesomeIcon aria-hidden="true" icon={faCheck} title="asked access" />
                  ) : (
                    <FontAwesomeIcon aria-hidden="true" icon={faXmark} title="did not ask access" />
                  )
                }
              </td>
            </tr>
          ))
          }
      </tbody>
    </Table>
  );
}

ExamStudentsView.propTypes = {
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(ExamStudentsView);
