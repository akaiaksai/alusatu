import React, { useState } from "react";
import ProductCard from "../../components/ProductCard/ProductCard";
import Categories from "../../components/Categories/Categories";
import Pagination from "../../components/Pagination/Pagination";
import styles from "./Home.module.css";
import formatPrice, { toPriceKzt } from "../../utils/formatPrice";
import { useNavigate } from "react-router-dom";
import { useData } from "../../store";
import { useTranslation } from "../../i18n";

const normalizeText = (value) => (value || "").toString().trim().toLowerCase();

const HOME_CATEGORIES = [
  "\u0422\u0435\u043b\u0435\u0444\u043e\u043d\u044b",
  "\u041d\u043e\u0443\u0442\u0431\u0443\u043a\u0438",
  "\u041e\u0434\u0435\u0436\u0434\u0430",
  "\u041e\u0431\u0443\u0432\u044c",
  "\u0427\u0430\u0441\u044b",
  "\u0421\u0443\u043c\u043a\u0438",
  "\u0410\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044b",
  "\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u0438\u043a\u0430",
  "\u0414\u043e\u043c \u0438 \u0441\u0430\u0434",
];

const PRICE_FILTER_MAX_KZT = 1_500_000;
const ITEMS_PER_PAGE = 20;

const Home = () => {
  const navigate = useNavigate();
  const { products: allProductsRaw, loading, error } = useData();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceMax] = useState(PRICE_FILTER_MAX_KZT);
  const [priceLimit, setPriceLimit] = useState(PRICE_FILTER_MAX_KZT);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("default");

  const allowedCategories = new Set(HOME_CATEGORIES);
  const allProducts = allProductsRaw.filter((p) => {
    const category = (p.category || "").trim();
    return allowedCategories.has(category);
  });

  const getProductsByCategory = (category) => {
    return allProducts.filter((p) => {
      const pcat = (p.category || "").toLowerCase();
      return pcat.includes(category.toLowerCase()) || category.toLowerCase().includes(pcat);
    });
  };

  const baseProducts =
    selectedCategory && selectedCategory !== "All"
      ? getProductsByCategory(selectedCategory)
      : allProducts;

  const visibleProducts = (() => {
    let result = baseProducts.filter((p) => toPriceKzt(p.price) <= priceLimit);
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
  })();
  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = visibleProducts.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const handleCategoryChange = (cat) => { setSelectedCategory(cat); setPage(1); };
  const handlePriceChange = (e) => { setPriceLimit(Math.min(priceMax, Number(e.target.value) || 0)); setPage(1); };
  const handleSortChange = (e) => { setSortBy(e.target.value); setPage(1); };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>{t("home.badge")}</span>
          <h1 className={styles.heroTitle}><span className={styles.heroBrand}>{t("home.brand")}</span></h1>
          <p className={styles.heroSubtitle}>{t("home.subtitle")}</p>
          <div className={styles.heroCta}>
            <button className={styles.heroBtn} onClick={() => navigate("/catalog")}>{t("home.gotoCatalog")}</button>
            <button className={styles.heroBtnOutline} onClick={() => navigate("/sell")}>{t("home.startSelling")}</button>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>10K+</span>
              <span className={styles.heroStatLabel}>{t("home.statProducts")}</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>5K+</span>
              <span className={styles.heroStatLabel}>{t("home.statBuyers")}</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>99%</span>
              <span className={styles.heroStatLabel}>{t("home.statSatisfied")}</span>
            </div>
          </div>
        </div>
      </div>

      <Categories onFilter={handleCategoryChange} />

      <div className={styles.filterSection}>
        <div className={styles.filterRow}>
          <div className={styles.priceFilterGroup}>
            <h3>{t("home.priceFilter")}</h3>
            <div className={styles.priceFilter}>
              <input
                type="range"
                min="0"
                max={priceMax}
                value={priceLimit}
                onChange={handlePriceChange}
                className={styles.slider}
              />
              <span className={styles.priceLabel}>{formatPrice(0)} - {formatPrice(priceLimit)}</span>
            </div>
          </div>
          <div className={styles.sortFilter}>
            <h3>{t("home.sort")}</h3>
            <select value={sortBy} onChange={handleSortChange} className={styles.sortSelect}>
              <option value="default">{t("home.sortDefault")}</option>
              <option value="price-asc">{t("home.sortPriceAsc")}</option>
              <option value="price-desc">{t("home.sortPriceDesc")}</option>
              <option value="name-asc">{t("home.sortNameAsc")}</option>
              <option value="name-desc">{t("home.sortNameDesc")}</option>
            </select>
          </div>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
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
      ) : (
        <>
          {paginatedProducts.length === 0 && <p className={styles.noProducts}>{t("home.noProducts")}</p>}
          <div className={styles.grid}>
            {paginatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination page={safePage} totalPages={totalPages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        </>
      )}
    </div>
  );
};

export default Home;


