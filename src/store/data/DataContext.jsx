import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { getCuratedProducts, getProducts } from "../../api/products.api";
import { getListedProducts } from "../../api/users.api";
import { mockProducts } from "../../data/mockProducts";

const DataContext = createContext(null);

const isPlaceholderImage = (url) =>
  /placeholder\.com|via\.placeholder\.com/i.test((url || "").toString());

const normalizeProductShape = (product) => {
  if (!product || typeof product !== "object") return null;

  const idRaw = product.id ?? product._id ?? product.productId;
  const id = String(idRaw ?? "").trim();
  if (!id) return null;

  const images = Array.isArray(product.images)
    ? product.images.filter((img) => String(img || "").trim())
    : [];
  const image = String(product.image || images[0] || "").trim();

  return {
    ...product,
    id,
    _id: id,
    name: product.name || product.title || "",
    image,
    images,
    category: String(product.category || "").trim(),
    price: Number(product.price || 0),
    userId: product.userId ? String(product.userId) : "",
  };
};

const dedupeProducts = (raw) => {
  const seenImages = new Set();
  return raw
    .map(normalizeProductShape)
    .filter((p) => {
    if (!p) return false;
    const img = (p.image || "").toString();
    if (!img.trim() || isPlaceholderImage(img)) return false;
    if (seenImages.has(img)) return false;
    const category = (p.category || "").toString().trim();
    if (!category) return false;
    seenImages.add(img);
    return true;
    });
};

export const DataProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadedOnce = useRef(false);
  const loadingRef = useRef(false);

  const loadProducts = useCallback(async (force = false) => {
    if (loadingRef.current) return;
    if (loadedOnce.current && !force) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let data = [];
      try {
        data = await getCuratedProducts({ perCategory: 20 });
        if (!data.length) data = await getProducts({ limit: 200 });
      } catch {
        data = [];
      }

      let listedApi = [];
      try {
        listedApi = await getListedProducts();
      } catch {
        listedApi = [];
      }

      let raw = [...data, ...listedApi];
      if (!raw.length) raw = mockProducts;

      const valid = dedupeProducts(raw);
      setProducts(valid);
      loadedOnce.current = true;
    } catch (e) {
      console.warn("DataContext: load failed, using mockProducts", e);
      setProducts(dedupeProducts(mockProducts));
      setError(e.message || "Failed to load products");
      loadedOnce.current = true;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const handler = () => loadProducts(true);
    window.addEventListener("myproducts:changed", handler);
    return () => window.removeEventListener("myproducts:changed", handler);
  }, [loadProducts]);

  const refresh = useCallback(() => loadProducts(true), [loadProducts]);

  return (
    <DataContext.Provider value={{ products, loading, error, refresh }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};
