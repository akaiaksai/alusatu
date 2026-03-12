import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useData } from "../data/DataContext";
import { useAuth } from "../auth/AuthContext";
import { getFavorites as apiGetFavorites, addFavorite as apiAddFavorite, removeFavorite as apiRemoveFavorite } from "../../api/users.api";

const FavoritesContext = createContext(null);

const readFavoritesByKey = (key) => {
  try {
    const direct = localStorage.getItem(key);
    if (direct != null) return JSON.parse(direct);
    if (key === "favorites:guest") {
      return JSON.parse(localStorage.getItem("favorites") || "[]");
    }
    return [];
  } catch {
    return [];
  }
};

const writeFavoritesByKey = (key, ids) => {
  localStorage.setItem(key, JSON.stringify(ids));
  if (key === "favorites:guest") {
    localStorage.setItem("favorites", JSON.stringify(ids));
  }
};

const getFavoritesStorageKey = (user) => {
  const id = user?.id || user?._id;
  return id ? `favorites:${id}` : "favorites:guest";
};

const normalizeIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  return ids
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);
};

export const FavoritesProvider = ({ children }) => {
  const { token, user } = useAuth();
  const storageKey = getFavoritesStorageKey(user);
  const [favorites, setFavoritesState] = useState(() => normalizeIds(readFavoritesByKey(storageKey)));
  const { products } = useData();
  const tokenRef = useRef(token);
  const favoritesRef = useRef(favorites);
  const storageKeyRef = useRef(storageKey);

  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { favoritesRef.current = favorites; }, [favorites]);
  useEffect(() => { storageKeyRef.current = storageKey; }, [storageKey]);

  const favCount = useMemo(() => {
    if (!favorites.length) return 0;
    if (!products.length) return 0;
    const productIds = new Set(products.map((p) => String(p.id)));
    return favorites.filter((id) => productIds.has(String(id))).length;
  }, [favorites, products]);

  const sync = useCallback((ids) => {
    const normalized = normalizeIds(ids);
    writeFavoritesByKey(storageKeyRef.current, normalized);
    setFavoritesState(normalized);
    window.dispatchEvent(new CustomEvent("favorites:changed"));
  }, []);

  useEffect(() => {
    const local = normalizeIds(readFavoritesByKey(storageKey));
    setFavoritesState(local);

    if (!token) return;

    apiGetFavorites()
      .then((serverIds) => sync(serverIds))
      .catch(() => {});
  }, [storageKey, token, sync]);

  const toggleFavorite = useCallback((id) => {
    const sid = String(id);
    const current = favoritesRef.current || [];
    const has = current.some((f) => String(f) === sid);
    const next = has
      ? current.filter((f) => String(f) !== sid)
      : [...current, sid];

    sync(next);

    if (tokenRef.current) {
      if (has) {
        apiRemoveFavorite(sid)
          .then((serverIds) => sync(serverIds))
          .catch(() => sync(current));
      } else {
        apiAddFavorite(sid)
          .then((serverIds) => sync(serverIds))
          .catch(() => sync(current));
      }
    }

    const added = !has;
    return added;
  }, [sync]);

  const isFavorite = useCallback((id) => {
    return (favoritesRef.current || []).some((f) => String(f) === String(id));
  }, []);

  const clearFavorites = useCallback(() => {
    const current = [...(favoritesRef.current || [])];
    sync([]);
    if (tokenRef.current && current.length) {
      Promise.all(current.map((id) => apiRemoveFavorite(id).catch(() => null)))
        .then(() => apiGetFavorites().then((serverIds) => sync(serverIds)).catch(() => {}))
        .catch(() => sync(current));
    }
  }, [sync]);

  const refreshFavorites = useCallback(() => {
    if (tokenRef.current) {
      apiGetFavorites()
        .then((serverIds) => sync(serverIds))
        .catch(() => setFavoritesState(normalizeIds(readFavoritesByKey(storageKeyRef.current))));
      return;
    }
    setFavoritesState(normalizeIds(readFavoritesByKey(storageKeyRef.current)));
  }, [sync]);

  useEffect(() => {
    const handler = () => refreshFavorites();
    window.addEventListener("favorites:changed", handler);
    return () => window.removeEventListener("favorites:changed", handler);
  }, [refreshFavorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, favCount, toggleFavorite, isFavorite, clearFavorites, refreshFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
};
