const router = require('express').Router();
const Order = require('../models/Order');
const User = require('../models/User');
const ListedProduct = require('../models/ListedProduct');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

// POST /api/orders/:id/refund — оформить возврат заказа и средств
router.post('/:id/refund', requireAuth, invalidateCache('/api/orders', '/api/products'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Нет доступа к возврату этого заказа' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Заказ уже отменён/возвращён' });
    }
    // Вернуть средства
    req.user.balance = (req.user.balance || 0) + order.total;
    await req.user.save();
    order.status = 'cancelled';
    await order.save();

    res.json({ success: true, balance: req.user.balance, order });
  } catch (err) {
    console.error('refund error:', err);
    res.status(500).json({ error: 'Ошибка возврата заказа' });
  }
});

// POST /api/orders — create order from current cart (deducts balance)
router.post('/', requireAuth, invalidateCache('/api/orders', '/api/cart', '/api/products'), async (req, res) => {
  try {
    const { items, total, totalItems, pickupDate, deliveryMethod, deliveryAddress, pickupAddress } = req.body;
    const user = req.user;

    // Check sufficient balance
    const currentBalance = user.balance || 0;
    if (currentBalance < total) {
      return res.status(400).json({
        error: 'Недостаточно средств на балансе. Пополните счёт, чтобы купить товар.',
        code: 'INSUFFICIENT_FUNDS',
        balance: currentBalance,
        required: total,
      });
    }

    // Check if any listed products are already sold
    const listedProductIds = (items || [])
      .map(i => String(i.productId))
      .filter(id => /^[a-f0-9]{24}$/i.test(id));

    if (listedProductIds.length > 0) {
      const listedProducts = await ListedProduct.find({ _id: { $in: listedProductIds } });
      const foundIds = new Set(listedProducts.map(p => String(p._id)));
      const soldProducts = listedProducts.filter(p => p.sold);
      const missingIds = listedProductIds.filter(id => !foundIds.has(id));
      if (soldProducts.length > 0 || missingIds.length > 0) {
        const soldNames = soldProducts.map(p => p.title).join(', ');
        return res.status(400).json({
          error: soldNames
            ? `Товар(ы) уже проданы: ${soldNames}`
            : 'Один или несколько товаров уже проданы или удалены',
          code: 'PRODUCT_SOLD',
        });
      }
    }

    // Deduct balance
    user.balance = currentBalance - total;

    const order = await Order.create({
      userId: user._id,
      username: user.username,
      items,
      total,
      totalItems,
      pickupDate: pickupDate || '',
      deliveryMethod: deliveryMethod || 'pickup',
      deliveryAddress: deliveryAddress || '',
      pickupAddress: pickupAddress || '',
      status: 'paid',
    });

    // Mark listed products as sold, then delete them from listings
    if (listedProductIds.length > 0) {
      await ListedProduct.deleteMany(
        { _id: { $in: listedProductIds } }
      );
    }

    // clear cart after order
    user.cart = [];
    await user.save();

    res.status(201).json({ ...order.toObject(), balance: user.balance });
  } catch (err) {
    console.error('create order error:', err.message, err.stack);
    res.status(500).json({ error: 'Ошибка создания заказа', details: err.message });
  }
});

// GET /api/orders — get my orders (cached 30s + ETag)
router.get('/', requireAuth, cacheMiddleware(30), async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

// GET /api/orders/all — admin: get all orders (cached 30s + ETag)
router.get('/all', requireAuth, requireAdmin, cacheMiddleware(30), async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

// PUT /api/orders/:id/status — admin: update order status
router.put('/:id/status', requireAuth, requireAdmin, invalidateCache('/api/orders'), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления заказа' });
  }
});

module.exports = router;
