const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, index: true },
    author: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  {
    timestamps: true,
  },
);

reviewSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
