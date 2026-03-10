const router = require('express').Router();
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

// PUT /api/users/balance — пополнение баланса
router.put('/balance', requireAuth, invalidateCache('/api/users'), async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Некорректная сумма' });
    }
    req.user.balance = (req.user.balance || 0) + amount;
    await req.user.save();
    res.json({ balance: req.user.balance });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка пополнения баланса' });
  }
});

// GET /api/users/profile — current user profile (cached 30s + ETag)
router.get('/profile', requireAuth, cacheMiddleware(30), (req, res) => {
  res.json({ user: req.user.toSafe() });
});

// PUT /api/users/profile — update profile
router.put('/profile', requireAuth, invalidateCache('/api/users'), async (req, res) => {
  try {
    const { username, email, phone, city } = req.body;
    const user = req.user;

    if (username && username !== user.username) {
      const exists = await User.findOne({ username, _id: { $ne: user._id } });
      if (exists) return res.status(400).json({ error: 'Этот username уже занят' });
      user.username = username;
    }
    if (email && email !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (exists) return res.status(400).json({ error: 'Этот email уже зарегистрирован' });
      user.email = email;
    }
    if (phone !== undefined) user.phone = phone;
    if (city !== undefined) user.city = city;

    await user.save();
    res.json({ user: user.toSafe() });
  } catch (err) {
    console.error('update profile error:', err);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

// GET /api/users — admin: list all users (cached 30s + ETag)
router.get('/', requireAuth, requireAdmin, cacheMiddleware(30), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(u => u.toSafe()));
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки пользователей' });
  }
});

// DELETE /api/users/:id — admin: delete user
router.delete('/:id', requireAuth, requireAdmin, invalidateCache('/api/users'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления пользователя' });
  }
});

module.exports = router;
