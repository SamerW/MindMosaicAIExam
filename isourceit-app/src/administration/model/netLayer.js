import { ROOT_AX, ROOT_URL } from '../../RESTInfo';

export function getExamSummary() {
  return ROOT_AX.get(`${ROOT_URL}/admin/exams`)
    .then((res) => res.data);
}

export function getSocratsSummary() {
  return ROOT_AX.get(`${ROOT_URL}/admin/socrats`)
    .then((res) => res.data);
}

export function getExamDetails({ examId }) {
  return ROOT_AX.get(`${ROOT_URL}/admin/exams/${examId}`, {
    params: {
      with_action_summary: true,
    },
  })
    .then((res) => res.data);
}

export function getSocratDetails({ socratId }) {
  return ROOT_AX.get(`${ROOT_URL}/admin/socrats/${socratId}`, {
    params: {
      with_action_summary: true,
    },
  })
    .then((res) => res.data);
}

export function createExam({ exam }) {
  return ROOT_AX.post(`${ROOT_URL}/admin/exams`, exam)
    .then((res) => res.data);
}

export function createSocrat({ socrat }) {
  return ROOT_AX.post(`${ROOT_URL}/admin/socrats`, socrat)
    .then((res) => res.data);
}

export function updateExam({ exam }) {
  return ROOT_AX.put(`${ROOT_URL}/admin/exams/${exam.id}`, exam)
    .then((res) => res.data);
}

export function updateSocrat({ socrat }) {
  return ROOT_AX.put(`${ROOT_URL}/admin/socrats/${socrat.id}`, socrat)
    .then((res) => res.data);
}

export function generateExamStudentsAuthUrls({ examId }) {
  return ROOT_AX.put(`${ROOT_URL}/admin/exams/${examId}/student-authentications`)
    .then((res) => res.data);
}

export function generateSocratStudentsAuthUrls({ socratId }) {
  return ROOT_AX.put(`${ROOT_URL}/admin/socrats/${socratId}/student-authentications`)
    .then((res) => res.data);
}

export function loadStudentActions({ examId, studentUsername, examType = 'exams' }) {
  return ROOT_AX.get(`${ROOT_URL}/admin/${examType}/${examId}/students/${studentUsername}/actions`)
    .then((res) => res.data);
}

export function getAppAvailableChats() {
  return ROOT_AX.get(`${ROOT_URL}/admin/app-settings/chats-available`)
    .then((res) => res.data);
}

export function getDefaultSocratInitPrompt() {
  return ROOT_AX.get(`${ROOT_URL}/admin/app-settings/default-socrat-init-prompt`)
    .then((res) => res.data);
}

export function getExamReport({ examId }) {
  return ROOT_AX.get(`${ROOT_URL}/admin/exams/${examId}/reports`)
    .then((res) => res.data);
}

export function getSocratReport({ socratId }) {
  return ROOT_AX.get(`${ROOT_URL}/admin/socrats/${socratId}/reports`)
    .then((res) => res.data);
}

export function getReportInfo({ reportId }) {
  return ROOT_AX.get(`${ROOT_URL}/admin/reports/${reportId}`)
    .then((res) => res.data);
}

export function clearReports() {
  return ROOT_AX.delete(`${ROOT_URL}/admin/reports`)
    .then((res) => res.data);
}
