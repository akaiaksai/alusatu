import React, { useState } from "react";
import styles from "./Categories.module.css";
import { useTranslation } from "../../i18n";

const CATEGORY_KEYS = [
  { key: "all", filter: "Все" },
  { key: "phones", filter: "Телефоны" },
  { key: "laptops", filter: "Ноутбуки" },
  { key: "clothing", filter: "Одежда" },
  { key: "shoes", filter: "Обувь" },
  { key: "watches", filter: "Часы" },
  { key: "bags", filter: "Сумки" },
  { key: "accessories", filter: "Аксессуары" },
  { key: "electronics", filter: "Электроника" },
  { key: "homeAndGarden", filter: "Дом и сад" },
];

const Categories = ({ onFilter }) => {
  const [selected, setSelected] = useState("all");
  const { t } = useTranslation();

  const handleSelect = (cat) => {
    setSelected(cat.key);
    onFilter(cat.filter === "Все" ? "All" : cat.filter);
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
