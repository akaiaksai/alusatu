import api from './axios';

const USERS_KEY = 'users';
const LOCAL_TOKEN_PREFIX = 'local-auth-token:';

function readUsers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function makeApiError(message, status = 400) {
  const err = new Error(message);
  err.response = { status, data: { error: message } };
  return err;
}

function shouldUseLocalAuthFallback(err) {
  if (!err?.response) return true;
  return err.response.status >= 500;
}

function toAuthUser(user) {
  return {
    id: user.id,
    _id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: !!user.isAdmin,
    phone: user.phone || '',
    city: user.city || '',
    balance: Number(user.balance || 0),
  };
}

function createLocalToken(userId) {
  return `${LOCAL_TOKEN_PREFIX}${userId}`;
}

function parseLocalToken(token) {
  if (!token || !token.startsWith(LOCAL_TOKEN_PREFIX)) return '';
  return token.slice(LOCAL_TOKEN_PREFIX.length);
}

function registerLocally({ username, email, password }) {
  const users = readUsers();
  const normalizedUsername = String(username || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedUsername || !normalizedEmail || !password) {
    throw makeApiError('Fill in all fields', 400);
  }
  if (password.length < 4) {
    throw makeApiError('Password must be at least 4 characters', 400);
  }
  if (users.some((u) => String(u.email || '').toLowerCase() === normalizedEmail)) {
    throw makeApiError('This email is already registered', 400);
  }
  if (users.some((u) => String(u.username || '') === normalizedUsername)) {
    throw makeApiError('This username is already taken', 400);
  }

  const newUser = {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    isAdmin: normalizedUsername.toLowerCase() === 'admin',
    phone: '',
    city: '',
    balance: 0,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  const token = createLocalToken(newUser.id);
  localStorage.setItem('token', token);
  return { token, user: toAuthUser(newUser) };
}

function loginLocally({ credential, password }) {
  const users = readUsers();
  const value = String(credential || '').trim();
  const normalized = value.toLowerCase();

  const user = users.find(
    (u) => String(u.email || '').toLowerCase() === normalized || String(u.username || '') === value
  );

  if (!user || user.password !== password) {
    throw makeApiError('Invalid email/username or password', 401);
  }

  const token = createLocalToken(user.id);
  localStorage.setItem('token', token);
  return { token, user: toAuthUser(user) };
}

function getLocalUserByToken() {
  const token = localStorage.getItem('token') || '';
  const userId = parseLocalToken(token);
  if (!userId) return null;

  const user = readUsers().find((u) => String(u.id) === String(userId));
  return user ? toAuthUser(user) : null;
}

export async function registerUser({ username, email, password }) {
  try {
    const { data } = await api.post('/api/auth/register', { username, email, password });
    if (data.token) localStorage.setItem('token', data.token);
    return data;
  } catch (err) {
    if (!shouldUseLocalAuthFallback(err)) throw err;
    return registerLocally({ username, email, password });
  }
}

export async function loginUser({ credential, password }) {
  try {
    const { data } = await api.post('/api/auth/login', { credential, password });
    if (data.token) localStorage.setItem('token', data.token);
    return data;
  } catch (err) {
    if (!shouldUseLocalAuthFallback(err)) throw err;
    return loginLocally({ credential, password });
  }
}

export async function getMe() {
  try {
    const { data } = await api.get('/api/auth/me');
    return data.user;
  } catch (err) {
    if (!shouldUseLocalAuthFallback(err)) throw err;
    const localUser = getLocalUserByToken();
    if (localUser) return localUser;
    throw err;
  }
}

export async function logout() {
  try {
    await api.post('/api/auth/logout');
  } catch { /* ignore */ }
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
}
