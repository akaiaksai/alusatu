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

const readLocalCart = () => {
  try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
  catch { return []; }
};

const saveLocal = (items) => localStorage.setItem("cart", JSON.stringify(items));
const calcCount = (items) => (items || []).reduce((s, i) => s + (i.quantity || 1), 0);

const toClient = (serverItems) =>
  (serverItems || []).map((i) => ({
    id: i.productId,
    name: i.name,
    price: i.price,
    image: i.image,
    quantity: i.quantity || 1,
  }));

const isListedProductId = (id) => /^[a-f0-9]{24}$/i.test(String(id ?? ''));

export const CartProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [cart, setCartState] = useState(readLocalCart);
  const [cartCount, setCartCount] = useState(() => calcCount(readLocalCart()));
  const tokenRef = useRef(token);
  const loadedRef = useRef(false);

  useEffect(() => { tokenRef.current = token; }, [token]);

  const persist = useCallback((items) => {
    saveLocal(items);
    setCartState(items);
    setCartCount(calcCount(items));
    window.dispatchEvent(new CustomEvent("cart:changed"));
  }, []);

  useEffect(() => {
    if (!token) { loadedRef.current = false; return; }
    if (loadedRef.current) return;
    loadedRef.current = true;

    apiGetCart()
      .then((serverCart) => {
        const serverItems = toClient(serverCart);
        const localItems = readLocalCart();

        const merged = [...serverItems];
        const idSet = new Set(merged.map((i) => String(i.id)));

        for (const local of localItems) {
          if (!idSet.has(String(local.id))) {
            merged.push(local);
            apiAddToCart({
              productId: local.id,
              name: local.name,
              price: local.price,
              image: local.image,
              quantity: local.quantity,
            }).catch(() => {});
          }
        }
        persist(merged);
      })
      .catch(() => {});
  }, [token, persist]);

  const addToCart = useCallback((product, qty = 1) => {
    const currentUserId = String(user?.id || user?._id || "");
    const ownerUserId = String(product?.userId || "");
    if (currentUserId && ownerUserId && currentUserId === ownerUserId) {
      return "OWN_PRODUCT";
    }

    const items = readLocalCart();
    const existing = items.find((i) => String(i.id) === String(product.id));

    if (isListedProductId(product.id)) {
      if (existing) return "ALREADY_IN_CART";
      items.push({ ...product, quantity: 1 });
    } else if (existing) {
      existing.quantity += qty;
    } else {
      items.push({ ...product, quantity: qty });
    }
    persist(items);

    if (tokenRef.current) {
      apiAddToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: qty,
      }).catch(() => {});
    }
  }, [persist, user?.id, user?._id]);

  const removeFromCart = useCallback((id) => {
    persist(readLocalCart().filter((i) => String(i.id) !== String(id)));
    if (tokenRef.current) apiRemoveFromCart(id).catch(() => {});
  }, [persist]);

  const updateQuantity = useCallback((id, qty) => {
    if (qty <= 0) {
      persist(readLocalCart().filter((i) => String(i.id) !== String(id)));
      if (tokenRef.current) apiRemoveFromCart(id).catch(() => {});
      return;
    }
    const finalQty = isListedProductId(id) ? 1 : qty;
    persist(readLocalCart().map((i) => String(i.id) === String(id) ? { ...i, quantity: finalQty } : i));
    if (tokenRef.current) apiUpdateCartItem(id, finalQty).catch(() => {});
  }, [persist]);

  const clearCart = useCallback(() => {
    persist([]);
    if (tokenRef.current) apiClearCart().catch(() => {});
  }, [persist]);

  const refreshCart = useCallback(() => {
    if (tokenRef.current) {
      apiGetCart()
        .then((serverCart) => {
          const items = toClient(serverCart);
          saveLocal(items);
          setCartState(items);
          setCartCount(calcCount(items));
        })
        .catch(() => {
          const items = readLocalCart();
          setCartState(items);
          setCartCount(calcCount(items));
        });
    } else {
      const items = readLocalCart();
      setCartState(items);
      setCartCount(calcCount(items));
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const items = readLocalCart();
      setCartState(items);
      setCartCount(calcCount(items));
    };
    window.addEventListener("cart:changed", handler);
    return () => window.removeEventListener("cart:changed", handler);
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
