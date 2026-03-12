import api from './axios';

const LOCAL_TOKEN_PREFIX = 'local-auth-token:';

function makeApiError(message, status = 400) {
  const err = new Error(message);
  err.response = { status, data: { error: message } };
  return err;
}

export function isLegacyLocalToken(token) {
  return String(token || '').startsWith(LOCAL_TOKEN_PREFIX);
}

function clearLegacyLocalToken() {
  const token = localStorage.getItem('token') || '';
  if (isLegacyLocalToken(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  }
}

export async function registerUser({ username, email, password }) {
  clearLegacyLocalToken();
  const { data } = await api.post('/api/auth/register', { username, email, password });
  if (data.token) localStorage.setItem('token', data.token);
  return data;
}

export async function loginUser({ credential, password }) {
  clearLegacyLocalToken();
  const { data } = await api.post('/api/auth/login', { credential, password });
  if (data.token) localStorage.setItem('token', data.token);
  return data;
}

export async function getMe() {
  const token = localStorage.getItem('token') || '';
  if (isLegacyLocalToken(token)) {
    clearLegacyLocalToken();
    throw makeApiError('Authentication required', 401);
  }

  const { data } = await api.get('/api/auth/me');
  return data.user;
}

export async function logout() {
  try {
    await api.post('/api/auth/logout');
  } catch { /* ignore */ }
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
}
