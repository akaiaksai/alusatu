import React, { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ProductCard from "../../components/ProductCard/ProductCard";
import Categories from "../../components/Categories/Categories";
import Pagination from "../../components/Pagination/Pagination";
import styles from "./Catalog.module.css";
import formatPrice, { toPriceKzt } from "../../utils/formatPrice";
import { useData } from "../../store";
import { useTranslation } from "../../i18n";

const normalizeCategoryValue = (value) => (value || "").toString().trim().toLowerCase();
const matchesCategory = (productCategory, selectedCategory) => {
  const p = normalizeCategoryValue(productCategory);
  const s = normalizeCategoryValue(selectedCategory);
  if (!s || s === "all") return true;
  if (!p) return false;
  if (p === s) return true;
  return p.includes(s) || s.includes(p);
};

const PRICE_FILTER_MAX_KZT = 1_500_000;
const ITEMS_PER_PAGE = 20;

const normalizeText = (value) => (value || "").toString().trim().toLowerCase();
const matchesSearch = (product, search) => {
  const q = normalizeText(search);
  if (!q) return true;
  const name = normalizeText(product?.name);
  const desc = normalizeText(product?.description);
  const cat = normalizeText(product?.category);
  return name.includes(q) || desc.includes(q) || cat.includes(q);
};

const Catalog = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const search = query.get("search") || "";
  const categoryFromQuery = query.get("category") || "";
  const { t } = useTranslation();

  const { products, loading, error } = useData();
  const [selectedCategory, setSelectedCategory] = useState(() => categoryFromQuery || "All");
  const [priceMax] = useState(PRICE_FILTER_MAX_KZT);
  const [priceLimit, setPriceLimit] = useState(PRICE_FILTER_MAX_KZT);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("default");

  const visibleProducts = useMemo(() => {
    let result = products.slice();
    if (selectedCategory && selectedCategory !== "All") {
      result = result.filter((p) => matchesCategory(p.category, selectedCategory));
    }
    result = result.filter((p) => toPriceKzt(p.price) <= priceLimit);

    if (search) {
      result.sort((a, b) => {
        const am = matchesSearch(a, search) ? 0 : 1;
        const bm = matchesSearch(b, search) ? 0 : 1;
        if (am !== bm) return am - bm;
        const an = normalizeText(a?.name);
        const bn = normalizeText(b?.name);
        return an.localeCompare(bn, "ru");
      });
    }

    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => toPriceKzt(a.price) - toPriceKzt(b.price));
        break;
      case "price-desc":
        result.sort((a, b) => toPriceKzt(b.price) - toPriceKzt(a.price));
        break;
      case "name-asc":
        result.sort((a, b) => normalizeText(a?.name).localeCompare(normalizeText(b?.name), "ru"));
        break;
      case "name-desc":
        result.sort((a, b) => normalizeText(b?.name).localeCompare(normalizeText(a?.name), "ru"));
        break;
      default:
        break;
    }

    return result;
  }, [products, selectedCategory, priceLimit, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = visibleProducts.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const handleCategoryChange = (cat) => { setSelectedCategory(cat); setPage(1); };
  const handlePriceChange = (e) => { setPriceLimit(Math.min(priceMax, Number(e.target.value) || 0)); setPage(1); };
  const handleSortChange = (e) => { setSortBy(e.target.value); setPage(1); };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className={styles.container}>
      <h1>{t("catalog.title")}</h1>

      <Categories onFilter={handleCategoryChange} selectedFilter={selectedCategory} />

      <div className={styles.filterSection}>
        <div className={styles.filterRow}>
          <div className={styles.priceFilter}>
            <h3>{t("catalog.priceFilter")}</h3>
            <input
              type="range"
              min="0"
              max={priceMax}
              value={priceLimit}
              onChange={handlePriceChange}
              className={styles.slider}
            />
            <span>{formatPrice(0)} - {formatPrice(priceLimit)}</span>
          </div>
          <div className={styles.sortFilter}>
            <h3>{t("catalog.sort")}</h3>
            <select value={sortBy} onChange={handleSortChange} className={styles.sortSelect}>
              <option value="default">{t("catalog.sortDefault")}</option>
              <option value="price-asc">{t("catalog.sortPriceAsc")}</option>
              <option value="price-desc">{t("catalog.sortPriceDesc")}</option>
              <option value="name-asc">{t("catalog.sortNameAsc")}</option>
              <option value="name-desc">{t("catalog.sortNameDesc")}</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeleton}>
              <div className={styles.skeletonImg} />
              <div className={styles.skeletonText}>
                <div className={styles.skeletonLine} style={{ width: "80%" }} />
                <div className={styles.skeletonLine} style={{ width: "55%" }} />
                <div className={styles.skeletonLine} style={{ width: "30%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {error && <p className={styles.error}>{t("catalog.error")}: {error}</p>}
          {visibleProducts.length === 0 ? (
            <p className={styles.noProducts}>{t("catalog.noProducts")}</p>
          ) : (
            <>
              <div className={styles.grid}>
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination page={safePage} totalPages={totalPages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Catalog;
