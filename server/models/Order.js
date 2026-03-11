const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  items: [{
    productId: mongoose.Schema.Types.Mixed,
    name: String,
    price: Number,
    quantity: Number,
    image: String,
  }],
  total: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  pickupDate: { type: String, default: '' },
  deliveryMethod: { type: String, enum: ['pickup', 'courier'], default: 'pickup' },
  deliveryAddress: { type: String, default: '' },
  pickupAddress: { type: String, default: '' },
  paidAt: { type: Date, default: Date.now },
  shippedAt: { type: Date, default: null },
  deliveryDate: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  receiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt', default: null },
  status: {
    type: String,
    enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
    default: 'paid',
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
