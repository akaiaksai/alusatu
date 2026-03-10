const crypto = require('crypto');

const store = new Map();
const DEFAULT_TTL = 60; 

function etag(body) {
  return crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
}


function cacheMiddleware(ttlSeconds = DEFAULT_TTL) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const cacheKey = req.originalUrl;
    const cached = store.get(cacheKey);

    const clientEtag = req.headers['if-none-match'];

    if (cached && Date.now() < cached.expires) {
      if (clientEtag && clientEtag === cached.etag) {
        return res.status(304).end();
      }
      res.set('ETag', cached.etag);
      res.set('X-Cache', 'HIT');
      return res.status(cached.statusCode).json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      const body = JSON.stringify(data);
      const tag = etag(body);

      if (clientEtag && clientEtag === tag) {
        return res.status(304).end();
      }

      store.set(cacheKey, {
        data,
        etag: tag,
        statusCode: res.statusCode || 200,
        expires: Date.now() + ttlSeconds * 1000,
      });

      res.set('ETag', tag);
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

function invalidateCache(...prefixes) {
  return (_req, _res, next) => {
    for (const [key] of store) {
      if (prefixes.some((p) => key.startsWith(p))) {
        store.delete(key);
      }
    }
    next();
  };
}

function flushCache() {
  store.clear();
}

module.exports = { cacheMiddleware, invalidateCache, flushCache };
