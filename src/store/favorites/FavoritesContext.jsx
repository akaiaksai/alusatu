import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { useData } from "../data/DataContext";

const FavoritesContext = createContext(null);

const readFavorites = () => {
  try { return JSON.parse(localStorage.getItem("favorites") || "[]"); }
  catch { return []; }
};

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavoritesState] = useState(readFavorites);
  const { products } = useData();

  const favCount = useMemo(() => {
    if (!favorites.length) return 0;
    if (!products.length) return 0;
    const productIds = new Set(products.map((p) => String(p.id)));
    return favorites.filter((id) => productIds.has(String(id))).length;
  }, [favorites, products]);

  const sync = (ids) => {
    localStorage.setItem("favorites", JSON.stringify(ids));
    setFavoritesState(ids);
    window.dispatchEvent(new CustomEvent("favorites:changed"));
  };

  const toggleFavorite = useCallback((id) => {
    const ids = readFavorites();
    const sid = String(id);
    const idx = ids.findIndex((f) => String(f) === sid);
    let added;
    if (idx >= 0) {
      ids.splice(idx, 1);
      added = false;
    } else {
      ids.push(id);
      added = true;
    }
    sync(ids);
    return added;
  }, []);

  const isFavorite = useCallback((id) => {
    return readFavorites().some((f) => String(f) === String(id));
  }, []);

  const clearFavorites = useCallback(() => {
    sync([]);
  }, []);

  const refreshFavorites = useCallback(() => {
    const ids = readFavorites();
    setFavoritesState(ids);
  }, []);

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
