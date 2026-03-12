const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

const toComparableId = (value) => String(value ?? '').trim();

router.get('/', requireAuth, cacheMiddleware(15), (req, res) => {
  res.json(req.user.favorites || []);
});

router.post('/', requireAuth, invalidateCache('/api/favorites'), async (req, res) => {
  try {
    const productId = toComparableId(req.body?.productId);
    if (!productId) {
      return res.status(400).json({ error: 'Некорректный productId' });
    }

    const user = req.user;
    const exists = (user.favorites || []).some((id) => toComparableId(id) === productId);
    if (!exists) {
      user.favorites.push(productId);
      await user.save();
    }
    res.json(user.favorites);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка добавления в избранное' });
  }
});

router.delete('/:productId', requireAuth, invalidateCache('/api/favorites'), async (req, res) => {
  try {
    const pid = toComparableId(req.params.productId);
    const user = req.user;
    user.favorites = (user.favorites || []).filter((id) => toComparableId(id) !== pid);
    await user.save();
    res.json(user.favorites);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления из избранного' });
  }
});

module.exports = router;
