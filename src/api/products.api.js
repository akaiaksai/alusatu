const BASE = "https://dummyjson.com";
const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000
function hashKey(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) {
    _cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function cacheSet(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}
async function cachedFetch(url) {
  const key = hashKey(url);
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const json = await res.json();
  cacheSet(key, json);
  return json;
}

const ALLOWED_CATEGORIES = [
  "Телефоны",
  "Ноутбуки",
  "Одежда",
  "Обувь",
  "Часы",
  "Сумки",
  "Аксессуары",
  "Электроника",
  "Дом и сад",
];

const CATEGORY_MAP = {
  smartphones: "Телефоны",
  laptops: "Ноутбуки",
  tablets: "Электроника",
  electronics: "Электроника",
  mobile: "Телефоны",
  "mobile-accessories": "Аксессуары",
  "mens-shirts": "Одежда",
  "womens-dresses": "Одежда",
  "womens-tops": "Одежда",
  "mens-shoes": "Обувь",
  "womens-shoes": "Обувь",
  "mens-watches": "Часы",
  "womens-watches": "Часы",
  "womens-bags": "Сумки",
  handbags: "Сумки",
  sunglasses: "Аксессуары",
  "home-decoration": "Дом и сад",
  furniture: "Дом и сад",
  lighting: "Дом и сад",
  "kitchen-accessories": "Дом и сад",
};

const isPlaceholderImage = (url) => {
  const s = (url || "").toString();
  return /placeholder\.com|via\.placeholder\.com/i.test(s) || s.trim() === "";
};

const normalizeCategory = (raw) => {
  const value = (raw || "").toString().trim();
  if (!value) return null;

  if (ALLOWED_CATEGORIES.includes(value)) return value;

  const key = value.toLowerCase();
  return CATEGORY_MAP[key] || null;
};

const pickImages = (p) => {
  const candidates = [
    ...(Array.isArray(p?.images) ? p.images : []),
    p?.thumbnail,
    p?.image,
  ];

  const out = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const s = (candidate || "").toString().trim();
    if (!s) continue;
    if (isPlaceholderImage(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
};

const normalizeProduct = (p) => {
  const category = normalizeCategory(p?.category);
  const images = pickImages(p);
  const image = images[0] || "";
  if (!category) return null;
  if (!image) return null;
  return {
    id: p.id,
    name: p.title || p.name || "",
    category,
    price: p.price ?? 0,
    image,
    images,
    description: p.description || "",
    _fromApi: true,
  };
};

const CURATED_RAW_CATEGORIES = [
  "smartphones",
  "laptops",
  "tablets",
  "mobile-accessories",
  "mens-shirts",
  "womens-dresses",
  "womens-tops",
  "mens-shoes",
  "womens-shoes",
  "mens-watches",
  "womens-watches",
  "womens-bags",
  "sunglasses",
  "home-decoration",
  "furniture",
  "lighting",
  "kitchen-accessories",
];

export async function getCuratedProducts({ perCategory = 12 } = {}) {
  const results = await Promise.allSettled(
    CURATED_RAW_CATEGORIES.map(async (cat) => {
      const url = `${BASE}/products/category/${encodeURIComponent(cat)}?limit=${perCategory}`;
      const data = await cachedFetch(url);
      return (data.products || []).map(normalizeProduct).filter(Boolean);
    }),
  );

  const all = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  const seenIds = new Set();
  const deduped = [];
  for (const p of all) {
    const key = String(p.id);
    if (seenIds.has(key)) continue;
    seenIds.add(key);
    deduped.push(p);
  }
  return deduped;
}

export async function getProducts({ limit = 100, skip = 0 } = {}) {
  try {
    const url = `${BASE}/products?limit=${limit}&skip=${skip}`;
    const data = await cachedFetch(url);
    return (data.products || []).map(normalizeProduct).filter(Boolean);
  } catch (e) {
    console.warn("getProducts failed", e);
    throw e;
  }
}

export async function searchProducts(q, { limit = 100 } = {}) {
  try {
    const url = `${BASE}/products/search?q=${encodeURIComponent(q)}&limit=${limit}`;
    const data = await cachedFetch(url);
    return (data.products || []).map(normalizeProduct).filter(Boolean);
  } catch (e) {
    console.warn("searchProducts failed", e);
    throw e;
  }
}

export default { getProducts, searchProducts, getCuratedProducts };
