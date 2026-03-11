import React, { useState } from "react";
import styles from "./Categories.module.css";
import { useTranslation } from "../../i18n";

const CATEGORY_KEYS = [
  { key: "all", filter: "All" },
  { key: "phones", filter: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d\u044b" },
  { key: "laptops", filter: "\u041d\u043e\u0443\u0442\u0431\u0443\u043a\u0438" },
  { key: "clothing", filter: "\u041e\u0434\u0435\u0436\u0434\u0430" },
  { key: "shoes", filter: "\u041e\u0431\u0443\u0432\u044c" },
  { key: "watches", filter: "\u0427\u0430\u0441\u044b" },
  { key: "bags", filter: "\u0421\u0443\u043c\u043a\u0438" },
  { key: "accessories", filter: "\u0410\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044b" },
  { key: "electronics", filter: "\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u0438\u043a\u0430" },
  { key: "homeAndGarden", filter: "\u0414\u043e\u043c \u0438 \u0441\u0430\u0434" },
];

const normalizeCategoryValue = (value) => (value || "").toString().trim().toLowerCase();

const getCategoryKeyByFilter = (filter) => {
  const normalized = normalizeCategoryValue(filter);
  if (!normalized || normalized === "all") return "all";

  const exact = CATEGORY_KEYS.find((cat) => normalizeCategoryValue(cat.filter) === normalized);
  if (exact) return exact.key;

  const partial = CATEGORY_KEYS.find((cat) => {
    if (cat.key === "all") return false;
    const catValue = normalizeCategoryValue(cat.filter);
    return catValue.includes(normalized) || normalized.includes(catValue);
  });

  return partial?.key || "all";
};

const Categories = ({ onFilter, selectedFilter }) => {
  const [internalSelected, setInternalSelected] = useState("all");
  const { t } = useTranslation();
  const selected = typeof selectedFilter === "undefined"
    ? internalSelected
    : getCategoryKeyByFilter(selectedFilter);

  const handleSelect = (cat) => {
    if (typeof selectedFilter === "undefined") {
      setInternalSelected(cat.key);
    }
    onFilter(cat.key === "all" ? "All" : cat.filter);
  };

  return (
    <div className={styles.container}>
      <h3>{t("categories.title")}</h3>
      <div className={styles.btns}>
        {CATEGORY_KEYS.map((cat) => (
          <button
            key={cat.key}
            className={`${styles.categoryBtn} ${selected === cat.key ? styles.active : ""}`}
            onClick={() => handleSelect(cat)}
          >
            {t(`categories.${cat.key}`)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Categories;
