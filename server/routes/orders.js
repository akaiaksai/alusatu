const router = require('express').Router();
const Order = require('../models/Order');
const Receipt = require('../models/Receipt');
const ListedProduct = require('../models/ListedProduct');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

const DAY_MS = 24 * 60 * 60 * 1000;

function toValidDate(value) {
  if (!value) return null;
  const dt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parsePickupDateToUtcDate(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function computeDeliveryDate({ pickupDate, createdAt, deliveryMethod }) {
  const fromPickupDate = parsePickupDateToUtcDate(pickupDate);
  if (fromPickupDate) return fromPickupDate;

  const created = toValidDate(createdAt) || new Date();
  const fallbackDays = deliveryMethod === 'courier' ? 3 : 2;
  return new Date(created.getTime() + fallbackDays * DAY_MS);
}

function computeShippedAt({ createdAt, deliveryDate }) {
  const created = toValidDate(createdAt) || new Date();
  const delivery = toValidDate(deliveryDate);

  if (!delivery) {
    return new Date(created.getTime() + 12 * 60 * 60 * 1000);
  }

  const diffMs = delivery.getTime() - created.getTime();
  if (diffMs <= 0) {
    return new Date(created.getTime() + 6 * 60 * 60 * 1000);
  }

  const midPoint = created.getTime() + Math.floor(diffMs / 2);
  return new Date(midPoint);
}

function generateReceiptNumber() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AS-${stamp}-${random}`;
}

function timedStatusForOrder(orderLike, now = new Date()) {
  if (!orderLike || orderLike.status === 'cancelled') return 'cancelled';

  const createdAt = toValidDate(orderLike.paidAt) || toValidDate(orderLike.createdAt) || new Date();
  const deliveryDate = toValidDate(orderLike.deliveryDate)
    || computeDeliveryDate({ pickupDate: orderLike.pickupDate, createdAt, deliveryMethod: orderLike.deliveryMethod });
  const shippedAt = toValidDate(orderLike.shippedAt)
    || computeShippedAt({ createdAt, deliveryDate });

  if (deliveryDate && now.getTime() >= deliveryDate.getTime()) {
    return 'delivered';
  }

  if (shippedAt && now.getTime() >= shippedAt.getTime()) {
    return 'shipped';
  }

  return 'paid';
}

async function applyTimedStatus(orderDoc, now = new Date()) {
  if (!orderDoc || orderDoc.status === 'cancelled') return orderDoc;

  const timedStatus = timedStatusForOrder(orderDoc, now);
  if (orderDoc.status === timedStatus) return orderDoc;

  orderDoc.status = timedStatus;

  if (!orderDoc.shippedAt) {
    orderDoc.shippedAt = computeShippedAt({
      createdAt: orderDoc.paidAt || orderDoc.createdAt,
      deliveryDate: orderDoc.deliveryDate,
    });
  }

  if (timedStatus === 'delivered' && !orderDoc.deliveredAt) {
    orderDoc.deliveredAt = now;
  }

  await orderDoc.save();
  return orderDoc;
}

function buildReceiptPayload(orderDoc) {
  const items = (orderDoc.items || []).map((item) => {
    const price = Number(item.price || 0);
    const quantity = Number(item.quantity || 0);
    return {
      productId: item.productId,
      name: item.name || '',
      price,
      quantity,
      image: item.image || '',
      lineTotal: price * quantity,
    };
  });

  return {
    orderId: orderDoc._id,
    userId: orderDoc.userId,
    receiptNumber: generateReceiptNumber(),
    buyer: orderDoc.username,
    paymentMethod: 'online',
    currency: 'KZT',
    issuedAt: orderDoc.createdAt || new Date(),
    items,
    total: Number(orderDoc.total || 0),
    totalItems: Number(orderDoc.totalItems || 0),
    deliveryMethod: orderDoc.deliveryMethod || 'pickup',
    pickupDate: orderDoc.pickupDate || '',
    deliveryDate: orderDoc.deliveryDate || null,
    deliveryAddress: orderDoc.deliveryAddress || '',
    pickupAddress: orderDoc.pickupAddress || '',
    pickupHours: orderDoc.pickupHours || '',
  };
}

async function attachReceipts(orders) {
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((order) => order._id);
  const receipts = await Receipt.find({ orderId: { $in: orderIds } }).lean();
  const receiptMap = new Map(receipts.map((receipt) => [String(receipt.orderId), receipt]));

  return orders.map((order) => ({
    ...order.toObject(),
    receipt: receiptMap.get(String(order._id)) || null,
  }));
}

router.post('/:id/refund', requireAuth, invalidateCache('/api/orders', '/api/products'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No access to refund this order' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Order already refunded/cancelled' });
    }

    req.user.balance = (req.user.balance || 0) + Number(order.total || 0);
    await req.user.save();

    order.status = 'cancelled';
    await order.save();

    res.json({ success: true, balance: req.user.balance, order });
  } catch (err) {
    console.error('refund error:', err);
    res.status(500).json({ error: 'Refund error' });
  }
});

router.post('/', requireAuth, invalidateCache('/api/orders', '/api/cart', '/api/products'), async (req, res) => {
  try {
    const { items, total, totalItems, pickupDate, deliveryMethod, deliveryAddress, pickupAddress } = req.body;
    const user = req.user;

    const currentBalance = Number(user.balance || 0);
    const orderTotal = Number(total || 0);

    if (currentBalance < orderTotal) {
      return res.status(400).json({
        error: 'Insufficient funds',
        code: 'INSUFFICIENT_FUNDS',
        balance: currentBalance,
        required: orderTotal,
      });
    }

    const listedProductIds = (items || [])
      .map((item) => String(item.productId))
      .filter((id) => /^[a-f0-9]{24}$/i.test(id));

    if (listedProductIds.length > 0) {
      const listedProducts = await ListedProduct.find({ _id: { $in: listedProductIds } });
      const foundIds = new Set(listedProducts.map((product) => String(product._id)));
      const soldProducts = listedProducts.filter((product) => product.sold);
      const missingIds = listedProductIds.filter((id) => !foundIds.has(id));

      if (soldProducts.length > 0 || missingIds.length > 0) {
        const soldNames = soldProducts.map((product) => product.title).join(', ');
        return res.status(400).json({
          error: soldNames
            ? `Product(s) already sold: ${soldNames}`
            : 'One or more products have already been sold or deleted',
          code: 'PRODUCT_SOLD',
        });
      }
    }

    const now = new Date();
    const normalizedDeliveryMethod = deliveryMethod === 'courier' ? 'courier' : 'pickup';
    const deliveryDate = computeDeliveryDate({ pickupDate, createdAt: now, deliveryMethod: normalizedDeliveryMethod });
    const shippedAt = computeShippedAt({ createdAt: now, deliveryDate });

    user.balance = currentBalance - orderTotal;

    const order = await Order.create({
      userId: user._id,
      username: user.username,
      items,
      total: orderTotal,
      totalItems,
      pickupDate: pickupDate || '',
      deliveryMethod: normalizedDeliveryMethod,
      deliveryAddress: deliveryAddress || '',
      pickupAddress: pickupAddress || '',
      status: 'paid',
      paidAt: now,
      shippedAt,
      deliveryDate,
    });

    const receipt = await Receipt.create(buildReceiptPayload(order));
    order.receiptId = receipt._id;
    await order.save();

    if (listedProductIds.length > 0) {
      await ListedProduct.deleteMany({ _id: { $in: listedProductIds } });
    }

    user.cart = [];
    await user.save();

    res.status(201).json({ ...order.toObject(), receipt, balance: user.balance });
  } catch (err) {
    console.error('create order error:', err.message, err.stack);
    res.status(500).json({ error: 'Order creation error', details: err.message });
  }
});

router.get('/', requireAuth, cacheMiddleware(30), async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const now = new Date();
    for (const order of orders) {
      await applyTimedStatus(order, now);
    }

    const payload = await attachReceipts(orders);
    res.json(payload);
  } catch (err) {
    console.error('orders list error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.get('/all', requireAuth, requireAdmin, cacheMiddleware(30), async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    const now = new Date();
    for (const order of orders) {
      await applyTimedStatus(order, now);
    }

    const payload = await attachReceipts(orders);
    res.json(payload);
  } catch (err) {
    console.error('orders list all error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.get('/:id/receipt', requireAuth, cacheMiddleware(30), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isOwner = String(order.userId) === String(req.user._id);
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const receipt = await Receipt.findOne({ orderId: order._id });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

    res.json(receipt);
  } catch (err) {
    console.error('receipt load error:', err);
    res.status(500).json({ error: 'Failed to load receipt' });
  }
});

router.put('/:id/status', requireAuth, requireAdmin, invalidateCache('/api/orders'), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json(order);
  } catch (err) {
    console.error('status update error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
