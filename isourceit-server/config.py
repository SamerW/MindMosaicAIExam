from datetime import timedelta

# BASE SERVER CONFIGURATION
# General
# use 0.0.0.0:5000 for a docker deployment
SERVER_HOST = '0.0.0.0'
SERVER_PORT = 5000
DEBUG = True
# CORS Configuration
ENABLE_CORS = True  # Enable CORS compliancy only if the front app is served by another server (mostly in dev. conf)
# Session configuration
SECRET_KEY = "3fc5c5170ebf71780ba3847bdcec28dd0e1b989ab415ea9d2fa9cc451b6cf4eb"
SESSION_COOKIE_NAME = "JSESSID"  # default JSESSIOND
SESSION_COOKIE_HTTPONLY = True  # default True
SESSION_COOKIE_SECURE = False  # default False
SESSION_PERMANENT = True  # default True
PERMANENT_SESSION_LIFETIME = timedelta(hours=2)  # default None (the cookie has a browser session lifetime)

# REDIS CONNECTION CONFIGURATION (used for websocket and asynchronous processing
REDIS_URL = 'redis://redis:6379'  # default redis://

# MONGODB CONNECTION CONFIGURATION
MONGO_HOST = 'mongo'  # default 'localhost
MONGO_PORT = 27017  # default
MONGO_DATABASE = 'gtp-exam-db'  # default
MONGO_USERNAME = 'gptexamusr'  # default None
MONGO_PASSWORD = 'TG72UdNkbTKQgLRd'  # default None
MONGO_AUTH_SOURCE = 'admin'  # default None

# STUDENT EXAM CONNECTION URL CONFIGURATION
# Ticket transmission configuration: how the ticket will be priveded to the student

# Will sent the ticket by mail to the student. Default False
TICKET_COM_SEND_MAIL = False
# Will show th ticket to the teacher. Up to the teacher to communicate this ticket afterwards. Default True
TICKET_COM_TEACHER = True
# Will show the ticket directly to the client who generate it. UNSECURED, to use only for debugging purpose.
# Default False
TICKET_COM_ANSWER_ON_GENERATE = False

# Student ticket encryption parameters
TICKET_STUDENT_KEY = "3fc5c5170ebf71780ba3847bdcec28dd0e1b989ab415ea9d2fa9cc451b6cf4eb"  # default my_secret_key
TICKET_STUDENT_SALT = "chat-ai-exam-srv"  # default chat-ai-exam-srv
# Parametric URL to provide to student to initiate connection. Modify according your deployment setting.
APP_COMPOSITION_AUTH_GENERATION_URL = 'http://:ip_address:8888/isourceit/composition/auth/generation/:exam_type/:exam_id'
# Parametric URL to validate a student authentication ticket, that will be sent by mail to students.
# Modify according your deployment setting.
APP_COMPOSITION_AUTH_VALIDATION_URL = 'http://:ip_address:8888/isourceit/composition/auth/validation?ticket=:ticket'

# Private KEY encryption parameters
# default b'WRfY1CgEmfvGEY4DRhxgSbpt2obQCe4cd7rx1qvGeto='
API_PV_KEY_ENC_KEY = 'sBwoRv5rjSBinytDLXZnLjLBUePtk_65bTNrPrVPkeI='

# STUDENT MAIL CONFIGURATION
# SMTP Access
# If mail server is None, no mail will be sent, and the connection url will be prompt
# directly to user (unsecured!)
MAIL_SERVER = 'smtp.my-mail-server.com'  # default ‘localhost’
MAIL_PORT = 25  # default 25
MAIL_USE_TLS = False  # default False
MAIL_USE_SSL = True  # default False
MAIL_USERNAME = None  # default None
MAIL_PASSWORD = None  # default None
# Sender configuration
MAIL_DEFAULT_SENDER = 'no-reply@my-mail-server.com'  # MANDATORY
MAIL_MAX_EMAILS = None  # default None
# MAIL_SUPPRESS_SEND = app.testing default app.testing
MAIL_ASCII_ATTACHMENTS = False  # default False
# Miscellaneous
# MAIL_DEBUG = app.debug  # default app.debug

# PDF GENERATION CONFIGURATION
# Temporary folder to generate archives of pdf
PDF_TEMP_DIR = './temppdf'  # default /tmp

# SOCRAT CONFIGURATION
DEFAULT_SOCRAT_INIT_PROMPT = """You should act as professor who follows the socratic approach for teaching.
I will give you a question and a final answer. 
You should propose a set of questions that you can ask to students in an interactive way one by one to guide them to the final answer.
Please don't answer the questions on behalf of students, only adapt the questions based on the student answers.
Give the questions in an interactive way one by one, and wait for the answer of the student before you move to the next question.
Change the questions based on the answer of the students."""
DEFAULT_SOCRAT_CHAT_TEMPERATURE = 0.2

# CHAT AI INTEGRATION

# Dalai Integration
# if CHATAI_DALAI_URL not set, this integration is disabled
# Access to the dalai webservice
#CHATAI_DALAI_URL = 'http://dalai-server:3000'

# Ollama Integration
# if CHATAI_Ollama_URL not set, this integration is disabled
# Access to the ollama webservice
CHATAI_OLLAMA_URL = 'http://127.0.0.1:11434'

# OpenAI Integration
# if CHATAI_OPENAI_ENABLED is set to True, OpenAI will be available
CHATAI_OPENAI_ENABLED = True
# CHATAI_OPENAI_POOL_SIZE define the number of threads to handle OpenAI chat requests (default 4)
# CHATAI_OPENAI_POOL_SIZE = 4
