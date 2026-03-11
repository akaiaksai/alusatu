const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.Mixed,
  name: { type: String, default: '' },
  price: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  image: { type: String, default: '' },
  lineTotal: { type: Number, default: 0 },
}, { _id: false });

const receiptSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiptNumber: { type: String, required: true, unique: true, index: true },
  buyer: { type: String, required: true },
  paymentMethod: { type: String, default: 'online' },
  currency: { type: String, default: 'KZT' },
  issuedAt: { type: Date, default: Date.now, index: true },
  items: { type: [receiptItemSchema], default: [] },
  total: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  deliveryMethod: { type: String, enum: ['pickup', 'courier'], default: 'pickup' },
  pickupDate: { type: String, default: '' },
  deliveryDate: { type: Date, default: null },
  deliveryAddress: { type: String, default: '' },
  pickupAddress: { type: String, default: '' },
  pickupHours: { type: String, default: '' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Receipt', receiptSchema);
