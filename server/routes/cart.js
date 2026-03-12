const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

const toComparableId = (value) => String(value ?? '').trim();

router.get('/', requireAuth, cacheMiddleware(15), (req, res) => {
  res.json(req.user.cart || []);
});

router.post('/', requireAuth, invalidateCache('/api/cart'), async (req, res) => {
  try {
    const { name, price, image } = req.body || {};
    const productId = toComparableId(req.body?.productId);
    const quantity = Number(req.body?.quantity) > 0 ? Number(req.body.quantity) : 1;
    if (!productId) {
      return res.status(400).json({ error: 'Некорректный productId' });
    }

    const user = req.user;
    const existing = (user.cart || []).find((i) => toComparableId(i.productId) === productId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      user.cart.push({ productId, name, price, image, quantity });
    }
    await user.save();
    res.json(user.cart);
  } catch (err) {
    console.error('add to cart error:', err);
    res.status(500).json({ error: 'Ошибка добавления в корзину' });
  }
});

router.put('/:productId', requireAuth, invalidateCache('/api/cart'), async (req, res) => {
  try {
    const pid = toComparableId(req.params.productId);
    const quantity = Number(req.body?.quantity);
    const user = req.user;

    if (!pid) {
      return res.status(400).json({ error: 'Некорректный productId' });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      user.cart = (user.cart || []).filter((i) => toComparableId(i.productId) !== pid);
    } else {
      const item = (user.cart || []).find((i) => toComparableId(i.productId) === pid);
      if (item) item.quantity = quantity;
    }
    await user.save();
    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления корзины' });
  }
});

router.delete('/:productId', requireAuth, invalidateCache('/api/cart'), async (req, res) => {
  try {
    const pid = toComparableId(req.params.productId);
    const user = req.user;
    user.cart = (user.cart || []).filter((i) => toComparableId(i.productId) !== pid);
    await user.save();
    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления из корзины' });
  }
});

router.delete('/', requireAuth, invalidateCache('/api/cart'), async (req, res) => {
  try {
    const user = req.user;
    user.cart = [];
    await user.save();
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка очистки корзины' });
  }
});

module.exports = router;
