import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Alert, Modal, ProgressBar } from 'react-bootstrap';
import { LoadingLoader } from '../../../common/components/Loading';
import ReportArchive from '../../model/ReportAchive';

function ReportArchiveModal({
  examType, examId, show, onClose,
}) {
  const [reportHdlr, setReportHdlr] = useState({ report: null, loading: true, error: null });

  useEffect(() => {
    if (show && examId) {
      setReportHdlr({ report: null, loading: true, error: null });
      let reportPromise;
      switch (examType) {
        case 'exam':
          reportPromise = ReportArchive.request_exam_report_archive(examId);
          break;
        case 'socrat':
          reportPromise = ReportArchive.request_socrat_report_archive(examId);
          break;
        default:
          throw new Error(`Unmanageable examType: ${examType}`);
      }
      reportPromise.then((report) => {
        setReportHdlr({
          report,
          loading: false,
          error: false,
        });
        if (report.isPending) {
          report.startAutoUpdate();
        }
      }, (error) => {
        setReportHdlr({
          report: null,
          loading: false,
          error,
        });
      });
      return () => {
        if (reportHdlr.report?.autoupdate) {
          reportHdlr.report.stopAutoUpdate();
        }
      };
    }
    return undefined;
  }, [examType, show, examId]);

  let modalBody;
  if (reportHdlr.loading) {
    modalBody = <h3 className="text-center"><LoadingLoader /></h3>;
  } else if (reportHdlr.error) {
    modalBody = <Alert variant="danger">{reportHdlr.error.message}</Alert>;
  } else if (reportHdlr.report.isError) {
    modalBody = <Alert variant="danger">{reportHdlr.report.error.message}</Alert>;
  } else if (reportHdlr.report.isPending) {
    modalBody = (
      <>
        <b>Building archive in progress...</b>
        <ProgressBar animated now={reportHdlr.report.progression} label={`${reportHdlr.report.progression}%`} />
      </>
    );
  } else if (reportHdlr.report.isReady) {
    modalBody = (
      <>
        <span className="text-success">Your archive is available here: </span>
        <a href={reportHdlr.report.archiveUrl}>{reportHdlr.report.archiveUrl}</a>
      </>
    );
  } else {
    modalBody = <Alert variant="warning">Unknown state</Alert>;
  }

  return (
    <Modal
      show={show}
      onHide={onClose}
      size="lg"
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>Report Archive Builder</Modal.Title>
      </Modal.Header>
      <Modal.Body className="justify-content-center">
        {
          modalBody
        }
      </Modal.Body>
    </Modal>
  );
}

ReportArchiveModal.propTypes = {
  examType: PropTypes.oneOf(['exam', 'socrat']).isRequired,
  examId: PropTypes.string,
  show: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

ReportArchiveModal.defaultProps = {
  examId: null,
  show: false,
};

export default observer(ReportArchiveModal);
