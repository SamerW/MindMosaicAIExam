import { observer } from 'mobx-react';
import React, { useContext, useEffect } from 'react';
import {
  Button, Col, Row, Table,
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import ExamMgmtStore from './ExamMgmtStore';
import { AdvancedLoading } from '../../common/components/Loading';
import { dateToLocalDateTimeString } from '../../services/timeService';

function ExamsViewTable() {
  const { manager } = useContext(ExamMgmtStore);

  useEffect(() => {
    manager.loadExamsSummary({});
  }, []);

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={8} lg={6}>
        <AdvancedLoading
          loading={manager.loading}
          loadingError={manager.loadingError}
        >
          <Row className="justify-content-between mb-3">
            <Col xs="auto">
              <Button variant="success" as={Link} to="new-exam">Create new exam</Button>
            </Col>
            <Col xs="auto">
              <Button variant="success" as={Link} to="new-socrat">Create new Socrate Questionnaire</Button>
            </Col>
            <Col xs="auto">
              <Button variant="primary" onClick={() => manager.loadExamsSummary({ force: true })}>Refresh</Button>
            </Col>
          </Row>
          <Row>
            <Col><h3>Exams</h3></Col>
          </Row>
          <Row>
            <Col>
              <Table responsive striped bordered hover size="sm" className="fittedTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th># questions</th>
                    <th># students</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {
                manager.examsSummary?.map((exam) => (
                  <tr key={exam.id}>
                    <td><Link to={`exams/${exam.id}`}>{exam.name}</Link></td>
                    <td>{exam.nbQuestions}</td>
                    <td>{exam.nbStudents}</td>
                    <td>{dateToLocalDateTimeString(exam.creationDate)}</td>
                  </tr>
                ))
                }
                </tbody>
              </Table>
            </Col>
          </Row>
          <Row>
            <Col><h3>Socrate questionnaires</h3></Col>
          </Row>
          <Row>
            <Col>
              <Table responsive striped bordered hover size="sm" className="fittedTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th># questions</th>
                    <th># students</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {
                manager.socratsSummary?.map((socrat) => (
                  <tr key={socrat.id}>
                    <td><Link to={`socrats/${socrat.id}`}>{socrat.name}</Link></td>
                    <td>{socrat.nbQuestions}</td>
                    <td>{socrat.nbStudents}</td>
                    <td>{dateToLocalDateTimeString(socrat.creationDate)}</td>
                  </tr>
                ))
                }
                </tbody>
              </Table>
            </Col>
          </Row>
        </AdvancedLoading>
      </Col>
    </Row>
  );
}

export default observer(ExamsViewTable);
