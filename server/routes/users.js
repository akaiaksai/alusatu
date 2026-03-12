const router = require('express').Router();
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

const DELETED_EMAIL_DOMAIN = 'deleted.local';

function buildDeletedEmail(userId) {
  return `${String(userId)}@${DELETED_EMAIL_DOMAIN}`;
}

router.put('/balance', requireAuth, invalidateCache('/api/users'), async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Некорректная сумма' });
    }

    req.user.balance = (req.user.balance || 0) + amount;
    await req.user.save();
    return res.json({ balance: req.user.balance });
  } catch (_err) {
    return res.status(500).json({ error: 'Ошибка пополнения баланса' });
  }
});

router.get('/profile', requireAuth, cacheMiddleware(30), (req, res) => {
  res.json({ user: req.user.toSafe() });
});

router.put('/profile', requireAuth, invalidateCache('/api/users'), async (req, res) => {
  try {
    const { username, email, phone, city, avatar } = req.body;
    const user = req.user;

    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    if (normalizedUsername && normalizedUsername !== user.username) {
      const exists = await User.findOne({ username: normalizedUsername, _id: { $ne: user._id } });
      if (exists) return res.status(400).json({ error: 'Этот username уже занят' });
      user.username = normalizedUsername;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email || '').trim().toLowerCase();

      if (!normalizedEmail) {
        user.email = buildDeletedEmail(user._id);
      } else if (normalizedEmail !== user.email) {
        const exists = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
        if (exists) return res.status(400).json({ error: 'Этот email уже зарегистрирован' });
        user.email = normalizedEmail;
      }
    }

    if (phone !== undefined) user.phone = String(phone || '').trim();
    if (city !== undefined) user.city = String(city || '').trim();
    if (avatar !== undefined) {
      const avatarValue = String(avatar || '').trim();
      if (avatarValue.length > 3 * 1024 * 1024) {
        return res.status(400).json({ error: 'Слишком большой размер аватара' });
      }
      user.avatar = avatarValue;
    }

    await user.save();
    return res.json({ user: user.toSafe() });
  } catch (err) {
    console.error('update profile error:', err);
    return res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

router.get('/', requireAuth, requireAdmin, cacheMiddleware(30), async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json(users.map((u) => u.toSafe()));
  } catch (_err) {
    return res.status(500).json({ error: 'Ошибка загрузки пользователей' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, invalidateCache('/api/users'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (_err) {
    return res.status(500).json({ error: 'Ошибка удаления пользователя' });
  }
});

module.exports = router;
