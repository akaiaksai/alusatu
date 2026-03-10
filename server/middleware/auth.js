const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'alu-satu-secret-key-2024';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';
const TOKEN_TTL_DAYS = 30;

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: `${TOKEN_TTL_DAYS}d` });
}

function getCookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...getCookieBaseOptions(),
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, getCookieBaseOptions());
}

function parseCookies(cookieHeader = '') {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((acc, pair) => {
    const [rawKey, ...rawValueParts] = pair.split('=');
    const key = (rawKey || '').trim();
    if (!key) return acc;

    const value = rawValueParts.join('=').trim();
    try {
      acc[key] = decodeURIComponent(value);
    } catch {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || '';
}

async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireAdmin,
  JWT_SECRET,
  AUTH_COOKIE_NAME,
};
