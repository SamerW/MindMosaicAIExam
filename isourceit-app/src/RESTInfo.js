import axios from 'axios';

const slashMatcher = /\/$/g;
export const ROOT_URL = `${APP_ENV_API_BASE_URL.replace(slashMatcher, '')}`;

export const ROOT_AX = axios.create({
  withCredentials: true,
  timeout: 90000,
});

ROOT_AX.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
