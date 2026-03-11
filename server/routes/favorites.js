const router = require('express').Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

router.get('/', requireAuth, cacheMiddleware(15), (req, res) => {
  res.json(req.user.favorites || []);
});

router.post('/', requireAuth, invalidateCache('/api/favorites'), async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;
    if (!user.favorites.includes(productId)) {
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
    const pid = Number(req.params.productId);
    const user = req.user;
    user.favorites = user.favorites.filter(id => id !== pid);
    await user.save();
    res.json(user.favorites);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления из избранного' });
  }
});

module.exports = router;
