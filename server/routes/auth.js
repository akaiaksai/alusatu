const router = require('express').Router();
const User = require('../models/User');
const {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Fill in all fields' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const normalizedEmail = email.toLowerCase();

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: 'This username is already taken' });
    }

    const isAdmin = username.toLowerCase() === 'admin';
    const user = await User.create({ username, email: normalizedEmail, password, isAdmin });
    const token = signToken(user._id);

    setAuthCookie(res, token);
    res.status(201).json({ token, user: user.toSafe() });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Registration error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { credential, password } = req.body;
    if (!credential || !password) {
      return res.status(400).json({ error: 'Fill in all fields' });
    }

    const user = await User.findOne({
      $or: [
        { email: credential.toLowerCase() },
        { username: credential },
      ],
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const token = signToken(user._id);
    setAuthCookie(res, token);
    res.json({ token, user: user.toSafe() });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Login error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

// GET /api/auth/me - get current user by token or auth cookie
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user.toSafe() });
});

module.exports = router;
