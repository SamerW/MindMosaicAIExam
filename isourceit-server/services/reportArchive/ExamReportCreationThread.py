import io
import logging
import tempfile
import zipfile
from datetime import datetime
from threading import Thread
from time import sleep
from typing import Union

from bson import ObjectId
from flask import current_app
from xhtml2pdf import pisa

from mongoDAO.MongoDAO import MongoDAO
from mongoDAO.reportArchiveRepository import update_report_archive_progression, set_report_archive_ready, \
    delete_full_report_archive
from mongoDAO.studentActionRepository import get_actions_for_student_for_exam
from mongoModel.Exam import Exam
from mongoModel.SocratQuestionnaire import SocratQuestionnaire
from services.reportArchive.examReportGeneration import generate_report

LOG = logging.getLogger(__name__)

REPORT_WAITING_DELAY_SEC = 5 * 60


class ExamReportCreationThread(Thread):
    __slots__ = ['__exam_type', '__exam', '__mongo_dao', '__report_id', '__base_path']

    def __init__(self, mongo_dao: MongoDAO, exam_type: str, exam: Union[Exam, SocratQuestionnaire], report_id: ObjectId ):
        super().__init__()
        self.__mongo_dao = mongo_dao
        self.__exam_type = exam_type
        self.__exam = exam
        self.__report_id = report_id
        self.__base_path = current_app.config.get('PDF_TEMP_DIR', '/tmp')

    def run(self):
        progression = 0
        student_percent_part = 100 // len(self.__exam['students'])
        try:
            # Create temporary file to store archive data
            with tempfile.SpooledTemporaryFile(suffix='__' + str(self.__exam['_id']), dir=self.__base_path) as tmp_file:
                # Create archive writer
                with zipfile.ZipFile(tmp_file, 'w', zipfile.ZIP_DEFLATED) as archive:
                    # Iterate students to generate a report for each of them
                    for student_username in filter(lambda u: u,
                                                   map(lambda s: s.get('username'), self.__exam['students'])):
                        # Retrieve student's action for the exam
                        actions = get_actions_for_student_for_exam(self.__mongo_dao, student_username,
                                                                   str(self.__exam['_id']))

                        # Create the html report, transform it into pdb and write it into the archive
                        html = ''.join(generate_report(self.__exam_type, self.__exam, student_username, actions))
                        with io.BytesIO() as pdf_file:
                            # Write pdf into bytes buffer
                            pisa_status = pisa.CreatePDF(src=html, dest=pdf_file, dest_bytes=True, debug=1)
                            # reset bytes buffer pointer to the begining and load buffer to archive file
                            pdf_file.seek(0)
                            archive.writestr('reports/{}.pdf'.format(student_username), pdf_file.read())
                        # update progression
                        progression = min(progression + student_percent_part, 100)
                        update_report_archive_progression(self.__mongo_dao, self.__report_id, progression)
                # Reset file pointer in order to save it to db
                tmp_file.seek(0)
                # Save the file to db and update report
                archive_name = 'exam_reports_{:%Y-%m-%d}.zip'.format(datetime.utcnow())
                ready_dt = datetime.utcnow()
                set_report_archive_ready(self.__mongo_dao, self.__report_id, archive_data=tmp_file.read(),
                                         archive_filename=archive_name, ready_dt=ready_dt)
                LOG.debug("Archive saved, wait for 5 minutes")
                sleep(REPORT_WAITING_DELAY_SEC)
        except Exception as e:
            LOG.warning("Unable to create archive: %s", str(e))
            raise
        finally:
            LOG.info("Delete report archive")
            delete_full_report_archive(self.__mongo_dao, self.__report_id)
