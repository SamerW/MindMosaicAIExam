import { observer } from 'mobx-react';
import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonGroup, Col, Row, Modal, Form,
} from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBackward } from '@fortawesome/free-solid-svg-icons';
import ExamMgmtStore from './ExamMgmtStore';
import { AdvancedLoading } from '../../common/components/Loading';
import ExamInfoView from './examInfo/ExamInfoView';
import ExamQuestionsView from './examInfo/ExamQuestionsView';
import ExamStudentsView from './examInfo/ExamStudentsView';
import ReportArchiveModal from './examInfo/ReportArchiveModal';
import ExamStudentsAccessView from './examInfo/ExamStudentsAccessView';
import { saveOllamaIP } from '../../composition/model/netLayer';

function ExamView({ examType }) {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { manager } = useContext(ExamMgmtStore);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showIPModal, setShowIPModal] = useState(false);
  const [ollamaIP, setOllamaIP] = useState('');

  useEffect(() => {
    switch (examType) {
      case 'exam':
        manager.loadDetailedExam({ examId, force: true });
        break;
      case 'socrat':
        manager.loadDetailedSocrat({ examId, force: true });
        break;
      default:
        throw new Error(`Unmanageable exam type: ${examType}`);
    }
  }, [examType, manager, examId]);

  const generatePdf = () => setShowReportModal(true);
  const editExam = () => navigate('edit');

  const handleIPModalOpen = () => setShowIPModal(true);
  const handleIPModalClose = () => setShowIPModal(false);

  const handleIPValidate = async() => {
    console.log(`Ollama IP Updated: ${ollamaIP}`);
    if (!ollamaIP.trim()) {
      alert('Message cannot be empty!');
      return;
    }
    try {
      // Call the commentOnAnswer function
      const data = await saveOllamaIP({
        OllamaIP: ollamaIP,
      });
  
      setShowIPModal(false); // Close the modal
    } catch (error) {
      console.error('Error sending comment:', error);
      alert('Failed to send update Ollama IP. Please try again.');
    } finally {
      setShowIPModal(false);
    }
    
  };

  const exam = manager.currentExam;

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={12} md={12} lg={10}>
        <AdvancedLoading
          loading={manager.loading}
          loadingError={manager.loadingError}
        >
          {
            exam && (
              <>
                <Row className="justify-content-around">
                  <Col xs={12} md={5} xl={4}>
                    <h4 className="text-primary">
                      <Button as={Link} to={-1} variant="outline-primary" className="me-2" size="sm">
                        <FontAwesomeIcon aria-hidden="true" icon={faBackward} title="asked access" />
                      </Button>
                      {exam.name}
                    </h4>
                    <ExamInfoView examType={examType} exam={exam} />
                  </Col>
                  <Col xs={12} md={5} xl={4}>
                    <h4 className="text-primary">Questions</h4>
                    <ExamQuestionsView exam={exam} examType={examType} />
                  </Col>
                  <Col xs={12} md={2} xl={2}>
                    <h4 className="text-primary">Actions</h4>
                    <ButtonGroup vertical>
                      <Button as={Link} to="analytics" variant="success">Show analytics panel</Button>
                      <Button onClick={generatePdf} variant="primary">Generate PDF report</Button>
                      <Button onClick={handleIPModalOpen} variant="info">Edit Ollama IP</Button>
                      <Button disabled={!exam.editable} variant="warning" onClick={editExam}>Edit</Button>
                    </ButtonGroup>
                  </Col>
                </Row>
                <Row className="justify-content-around">
                  <Col>
                    <h4>Students</h4>
                    <ExamStudentsView exam={exam} />
                  </Col>
                </Row>
                <Row className="justify-content-around">
                  <Col>
                    <h4>Students Access</h4>
                    <ExamStudentsAccessView exam={exam} examType={examType} />
                  </Col>
                </Row>
                <ReportArchiveModal
                  examType={examType}
                  examId={exam.id}
                  show={showReportModal}
                  onClose={() => setShowReportModal(false)}
                />
                <EditOllamaIPModal
                  show={showIPModal}
                  onClose={handleIPModalClose}
                  onValidate={handleIPValidate}
                  ollamaIP={ollamaIP}
                  setOllamaIP={setOllamaIP}
                />
              </>
            )
          }
        </AdvancedLoading>
      </Col>
    </Row>
  );
}

function EditOllamaIPModal({ show, onClose, onValidate, ollamaIP, setOllamaIP }) {
  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Edit Ollama IP</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Enter Ollama IP</Form.Label>
            <Form.Control
              type="text"
              value={ollamaIP}
              onChange={(e) => setOllamaIP(e.target.value)}
              placeholder="Enter IP address"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onValidate}>Validate</Button>
      </Modal.Footer>
    </Modal>
  );
}

EditOllamaIPModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
  ollamaIP: PropTypes.string.isRequired,
  setOllamaIP: PropTypes.func.isRequired,
};

ExamView.propTypes = {
  examType: PropTypes.oneOf(['exam', 'socrat']).isRequired,
};

export default observer(ExamView);
