from datetime import datetime, timedelta
from typing import Iterable, Tuple, TypedDict, NotRequired, Dict, List, Union
from mongoModel.Exam import Exam
from mongoModel.SocratQuestionnaire import SocratQuestionnaire
from mongoModel.StudentAction import StudentAction
import logging

__all__ = ['generate_report']
LOG = logging.getLogger(__name__)

class ActionSummary(TypedDict):
    nb_initial_ans: int
    nb_final_ans: int
    nb_chat_ai: int
    nb_rsc_add_not_removed: int
    nb_focus_lost: int
    total_time_focus_lost_sec: int
    has_submitted: bool
    started_ts: NotRequired[datetime]
    initial_answers_by_qidx: Dict[int, str]
    final_answers_by_qidx: Dict[int, str]


def format_bool(b: bool) -> str:
    return 'yes' if b else 'no'


def format_sec_duration(sec_duration: int) -> str:
    hours = sec_duration // (60*60)
    sec_left = sec_duration - hours*60*60
    minutes = sec_left // 60
    sec_left -= minutes*60
    return '{:d}h {:02d}m {:02d}s'.format(hours, minutes, sec_left)


def create_action_detail_fields(action: StudentAction) -> Tuple[str, str, str]:
    """

    :param action: an action
    :return: Tuple (Trace type, question, detail)
    """
    a_type = action['action_type']
    question = str(action['question_idx'] + 1) if action.get('question_idx', None) is not None else '-'
    if a_type == 'StartExam':
        return 'Started Exam', question, '-'
    elif a_type == 'ChangedQuestion':
        return 'Changed Question', question, 'next question: {:d}'.format(action['next_question_idx'] + 1)
    elif a_type == 'LostFocus':
        return 'Lost Focus', question, 'duration: {}, page hidden: {}'\
            .format(format_sec_duration(action['duration_seconds']), format_bool(action['duration_seconds']))
    elif a_type == 'WriteInitialAnswer':
        return 'Wrote Initial Answer', question, '-'
    elif a_type == 'AskChatAI':
        if 'comment' in action:
            comment = action['comment']
        else:
            comment = None
        return 'Asked Chat AI', question, (
        'Chat id: {}'.format(action['chat_id']),
        'Answer: {}'.format(action['answer']),
        'Comment: {}'.format(comment)
    )
    elif a_type == 'AddExternalResource':
        return 'Added External Resource', question, 'type: {}, title: {}, description: {}, removed: {}'\
            .format(action['rsc_type'], action['title'], action['description'], format_bool(bool(action['removed'])))
    elif a_type == 'WriteFinalAnswer':
        return 'Wrote Final Answer', question, '-'
    elif a_type == 'SubmitExam':
        return 'Submitted Exam', question, '-'
    else:
        return 'Unknown action', question, '-'


def create_action_summary(actions: Iterable[StudentAction]) -> ActionSummary:
    action_sum = ActionSummary(nb_initial_ans=0, nb_final_ans=0, nb_chat_ai=0, nb_rsc_add_not_removed=0,
                               nb_focus_lost=0, total_time_focus_lost_sec=0, has_submitted=False, started_ts=None,
                               initial_answers_by_qidx=dict(), final_answers_by_qidx=dict())
    for action in actions:
        a_type = action['action_type']
        if a_type == 'StartExam':
            action_sum['started_ts'] = action['timestamp']
        elif a_type == 'ChangedQuestion':
            pass
        elif a_type == 'LostFocus':
            action_sum['nb_focus_lost'] += 1
            action_sum['total_time_focus_lost_sec'] += action['duration_seconds']
        elif a_type == 'WriteInitialAnswer':
            action_sum['nb_initial_ans'] += 1
            action_sum['initial_answers_by_qidx'][action['question_idx']] = action['text']
        elif a_type == 'AskChatAI':
            action_sum['nb_chat_ai'] += 1
        elif a_type == 'AddExternalResource':
            if not action['removed']:
                action_sum['nb_rsc_add_not_removed'] += 1
        elif a_type == 'WriteFinalAnswer':
            action_sum['nb_final_ans'] += 1
            action_sum['final_answers_by_qidx'][action['question_idx']] = action['text']
        elif a_type == 'SubmitExam':
            action_sum['has_submitted'] = True
        else:
            pass

    return action_sum


def generate_report_style() -> str:
    yield """<style>
  h1 {
    color: #0d6efd;
    text-align: center;
  }
  h2 {
    color: #0d6efd;
  }
  h3 {
    margin-top: 1em;
    margin-bottom: 1em;
  }
  h4 {
    margin-top: 0;
    margin-bottom: 0;
  }
  ul.no-style {
    margin-left: 0;
    padding-left: 0;
    list-style-type: none;
  }
  .red-color {
    color: #dc3545;
  }
  pre {
    border: 1px solid black;
    padding: 1em;
  }
  table, th, td {
    border: 1px solid;
  }
  table {
    border-collapse: collapse;
  }
  th,td {
    padding-left: 1em;
    padding-right: 1em;
  }
</style>
"""


def generate_exam_report_title(exam_name: str, student_username: str) -> str:
    yield """<h1>Exam &ldquo;{}&rdquo; Report for {}</h1>""".format(exam_name, student_username)


def generate_socrat_report_title(exam_name: str, student_username: str) -> str:
    yield """<h1>Socrate questionnaire &ldquo;{}&rdquo; Report for {}</h1>""".format(exam_name, student_username)


def generate_exam_report_summary(exam_name: str, student_username: str, exam_start_date: datetime, ended: bool,
                                 submitted: bool) -> str:
    formated_start_date = exam_start_date.strftime('%Y-%m-%d %H:%M %z') if exam_start_date else 'Exam not started yet'
    yield """
<ul class="no-style">
<li>Exam: <b>{}</b></li>
<li>Student: <b>{}</b></li>
<li>Examination date: <b>{} GMT</b></li>
<li>Exam ended: <b class="red-color">{}</b></li>
<li>Exam submitted by student: <b class="red-color">{}</b></li>
</ul>
""".format(exam_name, student_username, formated_start_date, format_bool(ended), format_bool(submitted))


def generate_socrat_report_summary(exam_name: str, student_username: str, exam_start_date: datetime, ended: bool,
                                 submitted: bool) -> str:
    formated_start_date = exam_start_date.strftime('%Y-%m-%d %H:%M %z') if exam_start_date else 'Exam not started yet'
    yield """
<ul class="no-style">
<li>Socrate questionnaire: <b>{}</b></li>
<li>Student: <b>{}</b></li>
<li>Examination date: <b>{} GMT</b></li>
<li>Questionnaire ended: <b class="red-color">{}</b></li>
<li>Questionnaire submitted by student: <b class="red-color">{}</b></li>
</ul>
""".format(exam_name, student_username, formated_start_date, format_bool(ended), format_bool(submitted))


def generate_exam_answers(question_answers: Iterable[Tuple[str, str, str]]):
    """
    :param question_answers: list of tuples (question, initial answer, final answer)
    :return: string
    """
    yield '<h2>Answers</h2>'
    for idx, (question, initial_ans, final_ans) in enumerate(question_answers):
        yield """
<h3>Question {:d}: &ldquo;{:.30}&rdquo;</h3>
<h4>Final Answer</h4>
<pre>
{}
</pre>
<h4>Initial Answer</h4>
<pre>
{}
</pre>""".format(idx + 1, question["text"], final_ans, initial_ans)


def generate_socrat_answers(question_answers: Iterable[Tuple[str, str, str, str]]):
    """
    :param question_answers: list of tuples (question, teacher answer, initial answer, final answer)
    :return: string
    """
    yield '<h2>Answers</h2>'
    for idx, (question, teacher_ans, initial_ans, final_ans) in enumerate(question_answers):
        yield """
<h3>Question {:d}: &ldquo;{:.30}&rdquo;</h3>
<h4>Teacher Answer</h4>
<pre>
{}
</pre>
<h4>Final Answer</h4>
<pre>
{}
</pre>
<h4>Initial Answer</h4>
<pre>
{}
</pre>""".format(idx + 1, question, teacher_ans, final_ans, initial_ans)


def generate_action_summary(action_summary: ActionSummary) -> str:
    yield """
<h2>Actions summary</h2>
<ul>
<li>#inital answer edition: {:d}</li>
<li>#final answer edition: {:d}</li>
<li>#chat AI interaction: {:d}</li>
<li>#resource added not removed: {:d}</li>
<li>#focus lost: {:d}</li>
<li>total time focus lost: {}</li>
</ul>""".format(action_summary['nb_initial_ans'], action_summary['nb_final_ans'], action_summary['nb_chat_ai'],
                action_summary['nb_rsc_add_not_removed'], action_summary['nb_focus_lost'],
                format_sec_duration(action_summary['total_time_focus_lost_sec']))


def generate_actions_details(actions: Iterable[StudentAction]):
    yield """
<h2>Actions details</h2>
<table>
<thead><tr>
<th>Date</th>
<th>Action type</th>
<th>Question</th>
<th>Detail</th>
</tr></thead>
<tbody>"""

    for action in actions:
        trace_type, question, details = create_action_detail_fields(action)
        timestamp = action['timestamp']
        yield """
<tr>
<td>{:%Y-%m-%d %H:%M} GMT</td>
<td>{}</td>
<td>{}</td>
<td>{}</td>
</tr>""".format(timestamp, trace_type, question, details )

    yield """
</tbody>
</table>"""


def generate_exam_report(exam: Exam, student_username: str, actions: List[StudentAction]) -> str:
    # create action summary
    action_summary = create_action_summary(actions)
    # exam: either submitted, or started_ts + exam duration < now
    if action_summary['started_ts']:
        timeout_reached = (action_summary['started_ts'] + timedelta(
            minutes=exam['duration_minutes'])) > datetime.utcnow()
    else:
        timeout_reached = False
    ended_exam = action_summary['has_submitted'] or timeout_reached
    # yield different report parts, separated by line feeds
    yield from generate_report_style()
    yield from generate_exam_report_title(exam['name'], student_username)
    yield from generate_exam_report_summary(exam['name'], student_username, action_summary['started_ts'], ended_exam,
                                            action_summary['has_submitted'])
    yield from generate_exam_answers((q, action_summary['initial_answers_by_qidx'].get(idx, ''),
                                      action_summary['final_answers_by_qidx'].get(idx, ''))
                                     for (idx, q) in enumerate(exam['questions']))
    yield from generate_action_summary(action_summary)
    yield from generate_actions_details(actions)


def generate_socrat_report(exam: SocratQuestionnaire, student_username: str, actions: List[StudentAction]) -> str:
    # create action summary
    action_summary = create_action_summary(actions)
    # socrat: submitted only
    ended_exam = action_summary['has_submitted']
    # yield different report parts, separated by line feeds
    yield from generate_report_style()
    yield from generate_socrat_report_title(exam['name'], student_username)
    yield from generate_socrat_report_summary(exam['name'], student_username, action_summary['started_ts'], ended_exam,
                                              action_summary['has_submitted'])
    yield from generate_socrat_answers((q['question'], q['answer'],
                                        action_summary['initial_answers_by_qidx'].get(idx, ''),
                                        action_summary['final_answers_by_qidx'].get(idx, ''))
                                       for (idx, q) in enumerate(exam['questions']))
    yield from generate_action_summary(action_summary)
    yield from generate_actions_details(actions)


def generate_report(exam_type: str, exam: Union[Exam, SocratQuestionnaire], student_username: str, actions: List[StudentAction]) -> str:

    if exam_type == 'exam':
        yield from generate_exam_report(exam, student_username, actions)
    elif exam_type == 'socrat':
        yield from generate_socrat_report(exam, student_username, actions)
    else:
        raise Exception('Bad exam type: ' + str(exam_type))


