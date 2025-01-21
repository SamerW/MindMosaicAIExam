from flask import Flask
from flask_mail import Mail, Message

from utils.Singleton import Singleton


class MailService(metaclass=Singleton):
    def __init__(self, app: Flask = None):
        self.__mail = Mail(app)
        if app is None:
            self.__inited = False
        else:
            self.__inited = True

    def init_app(self, app: Flask):
        if self.__inited:
            raise Exception("Mail Service already initied")
        self.__mail.init_app(app)
        self.__inited = True

    @property
    def is_inited(self):
        return self.__inited

    def send_mail_for_exam_student_composition(self, student_mail: str, exam_name: str, access_url: str) -> None:
        if not self.__inited:
            raise Exception("Mail service not inited")
        msg = Message(subject="Exam access",
                      recipients=[student_mail])
        msg.body = """
Dear {},

You can now start the exam "{}" through this link: {}.

Sincerely,
The Chat AI exam platform robot.""".format(student_mail, exam_name, access_url)
        msg.html = """
<p>Dear {},
<br/><br/>
You can now start the exam "{}" through this link: <a href={}>{}</a>.
<br/><br/>
Sincerely,
<br/>
The I Source It platform robot.
</p>""".format(student_mail, exam_name, access_url, access_url)
        self.__mail.send(msg)

    def send_mail_for_socrat_student_composition(self, student_mail: str, exam_name: str, access_url: str) -> None:
        if not self.__inited:
            raise Exception("Mail service not inited")
        msg = Message(subject="Socrat questionnary access",
                      recipients=[student_mail])
        msg.body = """
Dear {},

You can now start the Socrat questionnary "{}" through this link: {}.

Sincerely,
The Chat AI exam platform robot.""".format(student_mail, exam_name, access_url)
        msg.html = """
<p>Dear {},
<br/><br/>
You can now start the Socrat questionnary "{}" through this link: <a href={}>{}</a>.
<br/><br/>
Sincerely,
<br/>
The I Source It platform robot.
</p>""".format(student_mail, exam_name, access_url, access_url)
        self.__mail.send(msg)
