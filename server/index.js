require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const cartRoutes = require('./routes/cart');
const favoritesRoutes = require('./routes/favorites');
const ordersRoutes = require('./routes/orders');
const productsRoutes = require('./routes/products');

const app = express();

app.set('trust proxy', 1);
const defaultAllowedOrigins = [
  'https://akaiaksai.app',
  'https://www.akaiaksai.app',
  'https://akaiaksai.github.io',
];

const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];
const localDevOriginRegex = /^https?:\/\/(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i;

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (localDevOriginRegex.test(origin)) return callback(null, true);
    return callback(null, allowedOrigins.includes(origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const PORT = Number(process.env.PORT) || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alu-satu';
const MONGO_CONNECT_TIMEOUT_MS = Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000);
const DB_OPTIONAL_API_PATHS = new Set(['/health', '/auth/logout']);

const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300);
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number.isFinite(RATE_LIMIT_MAX) && RATE_LIMIT_MAX > 0 ? RATE_LIMIT_MAX : 300,
});
app.use(limiter);

// Avoid 10s+ Mongoose buffering waits when DB is disconnected.
mongoose.set('bufferCommands', false);

function maskMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '<empty>';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:/?#]+:)([^@]+)(@)/i, '$1***$3');
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function requireDbConnection(req, res, next) {
  if (DB_OPTIONAL_API_PATHS.has(req.path.toLowerCase())) return next();
  if (isDbConnected()) return next();
  return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
}

app.use('/api', requireDbConnection);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);

app.use((err, _req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' });
  }
  return next(err);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongo: isDbConnected() ? 'connected' : 'disconnected' });
});

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: Number.isFinite(MONGO_CONNECT_TIMEOUT_MS) && MONGO_CONNECT_TIMEOUT_MS > 0
      ? MONGO_CONNECT_TIMEOUT_MS
      : 10000,
  })
  .then(() => {
    console.log('MongoDB connected:', maskMongoUri(MONGO_URI));
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    console.log('Starting server without MongoDB; API endpoints requiring DB will return 503');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT} (no DB)`);
    });
  });
