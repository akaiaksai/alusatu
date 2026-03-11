const router = require('express').Router();
const ListedProduct = require('../models/ListedProduct');
const Review = require('../models/Review');
const { requireAuth } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

function normalizeProduct(p) {
  return {
    id: p._id,
    name: p.title,
    price: p.price,
    category: p.category,
    description: p.description,
    image: (p.images && p.images[0]) || '',
    images: p.images || [],
    userId: p.userId,
    username: p.username,
    sold: p.sold || false,
    createdAt: p.createdAt,
  };
}

function normalizeReview(r) {
  return {
    id: r._id,
    productId: r.productId,
    author: r.author,
    rating: r.rating,
    text: r.text,
    date: r.createdAt,
  };
}

function normalizeImages({ image, images }) {
  const candidates = [];
  if (Array.isArray(images)) candidates.push(...images);
  if (typeof image === 'string' && image.trim()) candidates.push(image);

  const seen = new Set();
  const out = [];
  for (const candidate of candidates) {
    const value = (candidate || '').toString().trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

router.get('/listed', cacheMiddleware(60), async (_req, res) => {
  try {
    const products = await ListedProduct.find({ sold: { $ne: true } }).sort({ createdAt: -1 });
    res.json(products.map(normalizeProduct));
  } catch (_err) {
    res.status(500).json({ error: 'Failed to load listed products' });
  }
});

router.get('/listed/:id', cacheMiddleware(60), async (req, res) => {
  try {
    const product = await ListedProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Listed product not found' });
    }
    res.json(normalizeProduct(product));
  } catch (_err) {
    res.status(500).json({ error: 'Failed to load listed product' });
  }
});

router.get('/my', requireAuth, cacheMiddleware(30), async (req, res) => {
  try {
    const products = await ListedProduct.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(products.map(normalizeProduct));
  } catch (_err) {
    res.status(500).json({ error: 'Failed to load your listed products' });
  }
});

router.post('/', requireAuth, invalidateCache('/api/products'), async (req, res) => {
  try {
    const { title, price, category, description, image, images } = req.body || {};
    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price are required' });
    }

    const product = await ListedProduct.create({
      userId: req.user._id,
      username: req.user.username,
      title,
      price,
      category: category || 'Other',
      description: description || '',
      images: normalizeImages({ image, images }),
    });

    res.status(201).json(normalizeProduct(product));
  } catch (err) {
    console.error('create product error:', err);
    res.status(500).json({ error: 'Failed to create listed product' });
  }
});

router.get('/:productId/reviews', async (req, res) => {
  try {
    const productId = String(req.params.productId || '').trim();
    if (!productId) {
      return res.status(400).json({ error: 'Product id is required' });
    }

    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });
    res.json(reviews.map(normalizeReview));
  } catch (_err) {
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

router.post('/:productId/reviews', async (req, res) => {
  try {
    const productId = String(req.params.productId || '').trim();
    const rawAuthor = (req.body?.author || '').toString().trim();
    const text = (req.body?.text || '').toString().trim();
    const rating = Number(req.body?.rating);

    if (!productId) {
      return res.status(400).json({ error: 'Product id is required' });
    }
    if (!text) {
      return res.status(400).json({ error: 'Review text is required' });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const review = await Review.create({
      productId,
      author: rawAuthor || 'Аноним',
      rating: Math.round(rating),
      text,
    });

    res.status(201).json(normalizeReview(review));
  } catch (err) {
    console.error('create review error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.delete('/:productId/reviews/:reviewId', async (req, res) => {
  try {
    const productId = String(req.params.productId || '').trim();
    const reviewId = String(req.params.reviewId || '').trim();
    if (!productId || !reviewId) {
      return res.status(400).json({ error: 'Product id and review id are required' });
    }

    const deleted = await Review.findOneAndDelete({ _id: reviewId, productId });
    if (!deleted) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ success: true });
  } catch (_err) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

router.delete('/:id', requireAuth, invalidateCache('/api/products'), async (req, res) => {
  try {
    const product = await ListedProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Listed product not found' });
    }

    if (String(product.userId) !== String(req.user._id) && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await ListedProduct.findByIdAndDelete(req.params.id);
    await Review.deleteMany({ productId: String(req.params.id) });
    res.json({ success: true });
  } catch (_err) {
    res.status(500).json({ error: 'Failed to delete listed product' });
  }
});

module.exports = router;
