import React, { useContext, useState } from 'react';
import {
  Button, ButtonGroup, Col, Row,
} from 'react-bootstrap';
import { Outlet } from 'react-router-dom';
import { observer } from 'mobx-react';
import AdmExamManager from '../model/AdmExamManager';
import ExamMgmtStore from './ExamMgmtStore';
import RootStore from '../../RootStore';

function ExamsManagement() {
  const { currentUser } = useContext(RootStore);
  const [admExamManager] = useState({ manager: new AdmExamManager() });

  return (
    <>
      <Row className="justify-content-center align-items-center">
        <Col xs="auto">
          <h1>Exams & Questionnaires Management</h1>
        </Col>
        {
          currentUser.isAdmin && (
            <Col xs="auto">
              <ButtonGroup size="sm">
                <Button variant="secondary" onClick={() => AdmExamManager.clearReports()}>Clear reports</Button>
              </ButtonGroup>
            </Col>
          )
        }
      </Row>
      <ExamMgmtStore.Provider value={admExamManager}>
        <Outlet />
      </ExamMgmtStore.Provider>

    </>
  );
}

export default observer(ExamsManagement);
