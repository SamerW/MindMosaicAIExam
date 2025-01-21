from datetime import datetime
from typing import Optional, Tuple, Any, Dict, Iterable
from bson import ObjectId
from mongoDAO.MongoDAO import MongoDAO
from mongoModel.ReportArchive import ReportArchive


def find_report_archive_or_insert(dao: MongoDAO, exam_id: str) -> Tuple[ReportArchive, bool]:
    res = dao.report_archive_col.update_one({
        'exam_id': exam_id
    }, {
        '$setOnInsert': {
            'state': 'pending',
            'progression': 0,
            'creation_date': datetime.utcnow()
        }
    }, upsert=True)
    if res.upserted_id is None:
        return dao.report_archive_col.find_one({'exam_id': exam_id}), False
    else:
        return dao.report_archive_col.find_one({'_id': res.upserted_id}), True


def find_report_archive_by_id(dao: MongoDAO, report_id: ObjectId,
                              projection: Dict[str, int] = None) -> Optional[ReportArchive]:
    if not report_id:
        raise Exception('Id required to find report by id')
    return dao.report_archive_col.find_one({'_id': report_id}, projection=projection)


def find_report_file(dao: MongoDAO, archive_id: Any) -> Tuple[Optional[str], Optional[bytes]]:
    file = dao.grid_fs.get(archive_id)
    if file is not None:
        return file.filename, file.read()
    else:
        return None, None


def find_old_report(dao: MongoDAO, max_ready_date: Optional[datetime] = None) -> Iterable[ReportArchive]:
    rq_filter = dict(state='ready')
    if max_ready_date is not None:
        rq_filter['ready_date'] = {
            '$lte': max_ready_date
        }
    return dao.report_archive_col.find(rq_filter)


def delete_full_report_archive(dao: MongoDAO, report_id: ObjectId) -> None:
    res = dao.report_archive_col.find_one_and_delete({
        '_id': report_id
    })
    if res is not None and res.get('archive_id') is not None:
        dao.grid_fs.delete(res['archive_id'])


def update_report_archive_progression(dao: MongoDAO, report_id: ObjectId, progression: int) -> None:
    if progression > 100:
        raise Exception('Progression alone cannot be > 100')
    res = dao.report_archive_col.update_one({
        '_id': report_id,
    }, {
        '$set': {
            'progression': progression
        }
    })
    if res.modified_count == 0:
        raise Exception('report Id not found.')


def set_report_archive_ready(dao: MongoDAO, report_id: ObjectId, archive_data: bytes, archive_filename: str,
                             ready_dt: datetime) -> None:
    archive_id = dao.grid_fs.put(archive_data, filename=archive_filename)
    res = dao.report_archive_col.update_one({
        '_id': report_id,
    }, {
        '$set': {
            'state': 'ready',
            'progression': 100,
            'ready_date': ready_dt,
            'archive_id': archive_id
        }
    })
    if res.modified_count == 0:
        dao.grid_fs.delete(archive_id)
        raise Exception('report Id not found.')

