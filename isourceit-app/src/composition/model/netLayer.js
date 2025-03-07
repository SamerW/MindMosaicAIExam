import { ROOT_AX, ROOT_URL } from '../../RESTInfo';

export function getExamDetails({ examId }) {
  return ROOT_AX.get(`${ROOT_URL}/composition/exams/${examId}`)
    .then((res) => res.data);
}

export function getSocratDetails({ socratId }) {
  return ROOT_AX.get(`${ROOT_URL}/composition/socrats/${socratId}`)
    .then((res) => res.data);
}

export function startExam() {
  return ROOT_AX.post(`${ROOT_URL}/composition/actions`, {
    action_type: 'StartExam',
  })
    .then((res) => res.data);
}

export function changeQuestion({ questionId, nextQuestionId }) {
  return ROOT_AX.post(`${ROOT_URL}/composition/actions`, {
    action_type: 'ChangedQuestion',
    question_idx: questionId,
    next_question_idx: nextQuestionId,
  })
    .then((res) => res.data);
}

export function commentOnAnswer({
  questionId, comment
}) {
  return ROOT_AX.post(`${ROOT_URL}/composition/sendMessage`, {
    questionId: questionId,
    comment: comment
  })
    .then((res) => res.data);
}

export function sendQuerySearch({
  engine_id,query,question_id,
}) {
  return ROOT_AX.post(`${ROOT_URL}/composition/sendSearchQuery`, {
    action_type: 'SearchEngine',
    search_engine_id: engine_id,
    query: query,
    question_idx: question_id,
    search_engine_key: "",
  })
    .then((res) => res.data);
}

export function visitUrl({
  engine_id,url,question_id,
}) {
  return ROOT_AX.post(`${ROOT_URL}/composition/visitUrl`, {
    action_type: 'VisitUrl',
    search_engine_name: engine_id,
    url: url,
    question_idx: question_id,
  })
    .then((res) => res.data);
}



export function saveOllamaIP({
  OllamaIP
}) {
  return ROOT_AX.post(`${ROOT_URL}/admin/saveOllamaIP`, {
    OllamaIP: OllamaIP
  })
    .then((res) => res.data);
}


export function lostFocus({
  questionId, timestamp, returnTimestamp, durationSeconds, pageHidden,
}) {
  return ROOT_AX.post(`${ROOT_URL}/composition/actions`, {
    action_type: 'LostFocus',
    question_idx: questionId,
    timestamp: timestamp ? timestamp.toISOString() : null,
    return_timestamp: returnTimestamp,
    duration_seconds: durationSeconds,
    page_hidden: pageHidden,
  })
    .then((res) => res.data);
}

export function writeInitialAnswerQuestion({ questionId, text, timestamp = null }) {
  return ROOT_AX.post(`${ROOT_URL}/composition/actions`, {
    action_type: 'WriteInitialAnswer',
    question_idx: questionId,
    text,
    timestamp: timestamp ? timestamp.toISOString() : null,
  })
    .then((res) => res.data);
}

export function askChatAIQuestion({
  questionId, prompt, answer, chatId, chatKey, modelKey, image , timestamp = null,
}) {
  return ROOT_AX.post(`${ROOT_URL}/composition/actions`, {
    action_type: 'AskChatAI',
    question_idx: questionId,
    prompt,
    answer,
    chat_id: chatId,
    chat_key: chatKey,
    model_key: modelKey,
    image, // Add the image attribute
    timestamp: timestamp ? timestamp.toISOString() : null,
  })
    .then((res) => res.data);
}


export function addExternalResourceQuestion({
  questionId, title, description, rscType, timestamp = null,
}) {
  return ROOT_AX.post(`${ROOT_URL}/composition/actions`, {
    action_type: 'AddExternalResource',
    question_idx: questionId,
    title,
    description,
    rsc_type: rscType,
    timestamp: timestamp ? timestamp.toISOString() : null,
  })
    .then((res) => res.data);
}

export function removeExternalResourceQuestion({ actionId }) {
  return ROOT_AX.delete(`${ROOT_URL}/composition/actions/external-resources/${actionId}`)
    .then(() => true);
}

export function writeFinalAnswerQuestion({ questionId, text, timestamp = null }) {
  return ROOT_AX.post(`${ROOT_URL}/composition/actions`, {
    action_type: 'WriteFinalAnswer',
    question_idx: questionId,
    text,
    timestamp: timestamp ? timestamp.toISOString() : null,
  })
    .then((res) => res.data);
}

export function submitExam() {
  return ROOT_AX.post(`${ROOT_URL}/composition/actions`, {
    action_type: 'SubmitExam',
  })
    .then((res) => res.data);
}
