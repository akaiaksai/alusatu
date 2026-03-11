import api from './axios';

export async function registerUser({ username, email, password }) {
  const { data } = await api.post('/api/auth/register', { username, email, password });
  if (data.token) localStorage.setItem('token', data.token);
  return data; 
}

export async function loginUser({ credential, password }) {
  const { data } = await api.post('/api/auth/login', { credential, password });
  if (data.token) localStorage.setItem('token', data.token);
  return data; 
}

export async function getMe() {
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
