import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  removeFromCart as apiRemoveFromCart,
  updateCartItem as apiUpdateCartItem,
  clearCart as apiClearCart,
} from "../../api/users.api";

const CartContext = createContext(null);

const getCartStorageKey = (user) => {
  const id = user?.id || user?._id;
  return id ? `cart:${id}` : "cart:guest";
};

const normalizeLocalItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      id: String(item?.id ?? item?.productId ?? "").trim(),
      name: item?.name || "",
      price: Number(item?.price || 0),
      image: item?.image || "",
      quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
    }))
    .filter((item) => item.id);
};

const readLocalCartByKey = (key) => {
  try {
    const direct = localStorage.getItem(key);
    if (direct != null) return normalizeLocalItems(JSON.parse(direct));
    if (key === "cart:guest") {
      return normalizeLocalItems(JSON.parse(localStorage.getItem("cart") || "[]"));
    }
    return [];
  } catch {
    return [];
  }
};

const saveLocalByKey = (key, items) => {
  localStorage.setItem(key, JSON.stringify(items));
  if (key === "cart:guest") {
    localStorage.setItem("cart", JSON.stringify(items));
  }
};

const calcCount = (items) => (items || []).reduce((s, i) => s + (i.quantity || 1), 0);

const toClient = (serverItems) =>
  (serverItems || []).map((i) => ({
    id: String(i.productId ?? "").trim(),
    name: i.name,
    price: i.price,
    image: i.image,
    quantity: i.quantity || 1,
  })).filter((i) => i.id);

const isListedProductId = (id) => /^[a-f0-9]{24}$/i.test(String(id ?? ''));
const resolveProductId = (product) => String(product?.id ?? product?._id ?? product?.productId ?? "").trim();

export const CartProvider = ({ children }) => {
  const { token, user } = useAuth();
  const storageKey = getCartStorageKey(user);
  const [cart, setCartState] = useState(() => readLocalCartByKey(storageKey));
  const [cartCount, setCartCount] = useState(() => calcCount(readLocalCartByKey(storageKey)));
  const tokenRef = useRef(token);
  const storageKeyRef = useRef(storageKey);
  const cartRef = useRef(cart);

  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { storageKeyRef.current = storageKey; }, [storageKey]);
  useEffect(() => { cartRef.current = cart; }, [cart]);

  const persist = useCallback((items) => {
    const normalized = normalizeLocalItems(items);
    saveLocalByKey(storageKeyRef.current, normalized);
    setCartState(normalized);
    setCartCount(calcCount(normalized));
    window.dispatchEvent(new CustomEvent("cart:changed"));
  }, []);

  useEffect(() => {
    const localItems = readLocalCartByKey(storageKey);
    setCartState(localItems);
    setCartCount(calcCount(localItems));

    if (!token) return;

    apiGetCart()
      .then((serverCart) => persist(toClient(serverCart)))
      .catch(() => {});
  }, [storageKey, token, persist]);

  const addToCart = useCallback((product, qty = 1) => {
    const currentUserId = String(user?.id || user?._id || "");
    const ownerUserId = String(product?.userId || product?.ownerId || "");
    if (currentUserId && ownerUserId && currentUserId === ownerUserId) {
      return "OWN_PRODUCT";
    }

    const current = [...(cartRef.current || [])];
    const productId = resolveProductId(product);
    if (!productId) return "INVALID_PRODUCT";
    const existing = current.find((i) => String(i.id) === productId);
    const amount = Number(qty) > 0 ? Number(qty) : 1;
    const previous = [...current];
    const normalizedItem = {
      id: productId,
      name: String(product?.name || product?.title || "").trim(),
      price: Number(product?.price || 0),
      image: String(product?.image || "").trim(),
      quantity: isListedProductId(productId) ? 1 : amount,
    };

    if (isListedProductId(productId)) {
      if (existing) return "ALREADY_IN_CART";
      current.push({ ...normalizedItem, quantity: 1 });
    } else if (existing) {
      existing.quantity += amount;
    } else {
      current.push(normalizedItem);
    }
    persist(current);

    if (tokenRef.current) {
      apiAddToCart({
        productId,
        name: normalizedItem.name,
        price: normalizedItem.price,
        image: normalizedItem.image,
        quantity: isListedProductId(productId) ? 1 : amount,
      })
        .then((serverCart) => persist(toClient(serverCart)))
        .catch(() => persist(previous));
    }
  }, [persist, user?.id, user?._id]);

  const removeFromCart = useCallback((id) => {
    const sid = String(id);
    const previous = [...(cartRef.current || [])];
    persist(previous.filter((i) => String(i.id) !== sid));
    if (tokenRef.current) {
      apiRemoveFromCart(sid)
        .then((serverCart) => persist(toClient(serverCart)))
        .catch(() => persist(previous));
    }
  }, [persist]);

  const updateQuantity = useCallback((id, qty) => {
    const sid = String(id);
    const previous = [...(cartRef.current || [])];

    if (qty <= 0) {
      persist(previous.filter((i) => String(i.id) !== sid));
      if (tokenRef.current) {
        apiRemoveFromCart(sid)
          .then((serverCart) => persist(toClient(serverCart)))
          .catch(() => persist(previous));
      }
      return;
    }
    const finalQty = isListedProductId(sid) ? 1 : qty;
    persist(previous.map((i) => String(i.id) === sid ? { ...i, quantity: finalQty } : i));
    if (tokenRef.current) {
      apiUpdateCartItem(sid, finalQty)
        .then((serverCart) => persist(toClient(serverCart)))
        .catch(() => persist(previous));
    }
  }, [persist]);

  const clearCart = useCallback(() => {
    const previous = [...(cartRef.current || [])];
    persist([]);
    if (tokenRef.current) {
      apiClearCart()
        .then((serverCart) => persist(toClient(serverCart)))
        .catch(() => persist(previous));
    }
  }, [persist]);

  const refreshCart = useCallback(() => {
    if (tokenRef.current) {
      apiGetCart()
        .then((serverCart) => {
          persist(toClient(serverCart));
        })
        .catch(() => {
          const items = readLocalCartByKey(storageKeyRef.current);
          setCartState(items);
          setCartCount(calcCount(items));
        });
    } else {
      const items = readLocalCartByKey(storageKeyRef.current);
      setCartState(items);
      setCartCount(calcCount(items));
    }
  }, [persist]);

  useEffect(() => {
    const handler = () => {
      const items = readLocalCartByKey(storageKeyRef.current);
      setCartState(items);
      setCartCount(calcCount(items));
    };
    window.addEventListener("cart:changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("cart:changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return (
    <CartContext.Provider value={{ cart, cartCount, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
