import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from './Favorites.module.css'
import ProductCard from "../../components/ProductCard/ProductCard";
import { useFavorites, useData } from "../../store";
import { useTranslation } from "../../i18n";

const Favorites = () => {
  const navigate = useNavigate();
  const { favorites: favoriteIds } = useFavorites();
  const { products: allProducts, loading } = useData();
  const { t } = useTranslation();

  const validFavorites = useMemo(() => {
    if (!favoriteIds.length) return [];

    const map = new Map();
    allProducts.forEach((p) => map.set(String(p.id), p));

    const resolved = [];
    for (const id of favoriteIds) {
      const p = map.get(String(id));
      if (p && p.image && !/placeholder\.com/.test(p.image) && p.image.trim() !== "") {
        resolved.push(p);
      }
    }
    return resolved;
  }, [favoriteIds, allProducts]);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>{t("favorites.title")}</h1>
        {!loading && validFavorites.length > 0 && (
          <span className={styles.count}>{validFavorites.length} {validFavorites.length > 4 ? t("favorites.items5") : validFavorites.length > 1 ? t("favorites.items24") : t("favorites.item")}</span>
        )}
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton}>
              <div className={styles.skeletonImg} />
              <div className={styles.skeletonText}>
                <div className={styles.skeletonLine} style={{ width: "80%" }} />
                <div className={styles.skeletonLine} style={{ width: "50%" }} />
                <div className={styles.skeletonLine} style={{ width: "30%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : validFavorites.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <h2 className={styles.emptyTitle}>{t("favorites.emptyTitle")}</h2>
          <p className={styles.emptyText}>{t("favorites.emptyText")}</p>
          <button className={styles.emptyBtn} onClick={() => navigate("/catalog")}>{t("favorites.goToCatalog")}</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {validFavorites.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
