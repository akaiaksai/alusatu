const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DELETED_EMAIL_DOMAIN = 'deleted.local';
function isDeletedEmail(value) {
  const email = String(value || '').toLowerCase().trim();
  return email.endsWith(`@${DELETED_EMAIL_DOMAIN}`);
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 4,
  },
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  avatar: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },
  favorites: [{ type: mongoose.Schema.Types.Mixed }],
  cart: [{
    productId: mongoose.Schema.Types.Mixed,
    name: String,
    price: Number,
    image: String,
    quantity: { type: Number, default: 1 },
  }],
  balance: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (raw) {
  return bcrypt.compare(raw, this.password);
};

userSchema.methods.toSafe = function () {
  const obj = this.toObject();
  if (isDeletedEmail(obj.email)) {
    obj.email = '';
  }
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
