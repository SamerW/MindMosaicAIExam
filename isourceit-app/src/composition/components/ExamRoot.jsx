import React, { useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Alert, Col, Row } from 'react-bootstrap';
import StuManager from '../model/StuManager';
import RootStore from '../../RootStore';
import { LoadingLoader } from '../../common/components/Loading';
import ExamReady from './ExamReady';
import ExamEnded from './ExamEnded';
import ExamSubmit from './ExamSubmit';
import ExamComposition from './ExamComposition';

function ExamRoot() {
  const { currentUser } = useContext(RootStore);
  const [examMgr, setExamMgr] = useState(null);

  useEffect(() => {
    if (!examMgr) {
      return undefined;
    }
    examMgr.socketManager.init();
    return () => {
      examMgr.socketManager.release();
      if (examMgr.exam) {
        if (examMgr.exam.focusManager.running) {
          examMgr.exam.focusManager.releaseListeners();
        }
        if (examMgr.exam.timeoutManager.running) {
          examMgr.exam.timeoutManager.stopTimer();
        }
      }
    };
  }, [examMgr]);

  useEffect(() => {
    if (currentUser?.context?.examId) {
      const ctxt = currentUser.context;
      setExamMgr(new StuManager({
        examType: ctxt.examType,
        examId: ctxt.examId,
        examStarted: ctxt.examStarted,
        examEnded: ctxt.examEnded,
        timeout: ctxt.timeout,
      }));
    }
  }, [currentUser, currentUser.context]);

  let view;

  if (!examMgr || examMgr.loading) {
    view = <h2><LoadingLoader /></h2>;
  } else if (examMgr.loadingError) {
    view = <Alert variant="danger">{examMgr.loadingError.message}</Alert>;
  } else if (!examMgr.exam.started) {
    view = <ExamReady exam={examMgr.exam} />;
  } else if (examMgr.exam.ended) {
    view = <ExamEnded exam={examMgr.exam} />;
  } else if (examMgr.exam.onSubmit) {
    view = <ExamSubmit exam={examMgr.exam} />;
  } else {
    console.log(examMgr.exam);
    view = <ExamComposition exam={examMgr.exam} />;
  }

  if (examMgr && !examMgr.socketManager.connected) {
    return (
      <>
        {view}
        <Row className="mt-3 justify-content-center">
          <Col md={6} lg={4}>
            <Alert variant="danger">
              <Alert.Heading>Chat AI service unavailables</Alert.Heading>
              <p>
                It appears you are currently not able to communication
                with the chat AI service.
              </p>
            </Alert>
          </Col>
        </Row>

      </>
    );
  }
  return view;
}

export default observer(ExamRoot);
