const router = require('express').Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

// GET /api/cart — get user cart (cached 15s + ETag)
router.get('/', requireAuth, cacheMiddleware(15), (req, res) => {
  res.json(req.user.cart || []);
});

// POST /api/cart — add item to cart (or increase qty)
router.post('/', requireAuth, invalidateCache('/api/cart'), async (req, res) => {
  try {
    const { productId, name, price, image, quantity } = req.body;
    const user = req.user;
    const existing = user.cart.find(i => i.productId === productId);

    if (existing) {
      existing.quantity += (quantity || 1);
    } else {
      user.cart.push({ productId, name, price, image, quantity: quantity || 1 });
    }
    await user.save();
    res.json(user.cart);
  } catch (err) {
    console.error('add to cart error:', err);
    res.status(500).json({ error: 'Ошибка добавления в корзину' });
  }
});

// PUT /api/cart/:productId — update quantity
router.put('/:productId', requireAuth, invalidateCache('/api/cart'), async (req, res) => {
  try {
    const pid = Number(req.params.productId) || req.params.productId;
    const { quantity } = req.body;
    const user = req.user;

    if (quantity <= 0) {
      user.cart = user.cart.filter(i => i.productId !== pid);
    } else {
      const item = user.cart.find(i => i.productId === pid);
      if (item) item.quantity = quantity;
    }
    await user.save();
    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления корзины' });
  }
});

// DELETE /api/cart/:productId — remove item from cart
router.delete('/:productId', requireAuth, invalidateCache('/api/cart'), async (req, res) => {
  try {
    const pid = Number(req.params.productId) || req.params.productId;
    const user = req.user;
    user.cart = user.cart.filter(i => i.productId !== pid);
    await user.save();
    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления из корзины' });
  }
});

// DELETE /api/cart — clear entire cart
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
