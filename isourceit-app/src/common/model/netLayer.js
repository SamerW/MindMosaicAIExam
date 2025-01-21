import { ROOT_AX, ROOT_URL } from '../../RESTInfo';

export function initNetworkInterceptors(errorManager) {
  // Init Net. interceptors
  ROOT_AX.interceptors.request.use((config) => config, (error) => {
    if (!error?.request?.config?.appConfig?.failSilently) {
      errorManager.addError(error.message, 'Erreur avant requête');
    }
    return Promise.reject(error);
  });
  ROOT_AX.interceptors.response.use((response) => response, (error) => {
    if (!error?.config?.appConfig?.failSilently) {
      const message = error?.response?.data?.message
        ? `${error.message} (${error.response.data.message})` : error.message;
      errorManager.addError(message, 'Erreur de requête');
    }
    return Promise.reject(error);
  });
}

/*
{
  role, user:{username}, 'exam_id', 'exam_started', 'exam_ended', 'timeout'
}
*/
export function getUserContextInfo({ failSilently = false }) {
  return ROOT_AX.get(`${ROOT_URL}/user-context`, {
    appConfig: {
      failSilently,
    },
  }).then((res) => res.data);
}

/*
204
*/
export function logout() {
  return ROOT_AX.post(`${ROOT_URL}/logout`);
}

/*
{
  role, user:{username}, 'exam_id', 'exam_started', 'exam_ended', 'timeout'
}
*/
export function administrativeAuthentication({ username, password }) {
  return ROOT_AX.post(`${ROOT_URL}/admin/login`, {
    username,
    password,
  })
    .then((res) => res.data);
}

/*
204
*/
export function generateAuthenticationToken({ username, examType, examId }) {
  return ROOT_AX.post(`${ROOT_URL}/composition/access`, {
    username,
    exam_id: examId,
    exam_type: examType,
  })
    .then((res) => res.data);
}

/*
{
  role, user:{username}, 'exam_id', 'exam_started', 'exam_ended', 'timeout'
}
*/
export function ticketAuthentication({ ticket }) {
  return ROOT_AX.post(`${ROOT_URL}/composition/ticket-login`, {
    ticket,
  })
    .then((res) => res.data);
}
