import React from "react";
import styles from "./Pagination.module.css";
import { useTranslation } from "../../i18n";
const Pagination = ({ page, totalPages, onChange }) => {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  const pages = [];
  const add = (n) => { if (!pages.includes(n)) pages.push(n); };

  add(1);
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
  add(totalPages);
  pages.sort((a, b) => a - b);
  const items = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) {
      items.push({ type: "dots", key: `d${pages[i]}` });
    }
    items.push({ type: "page", value: pages[i], key: `p${pages[i]}` });
  }

  return (
    <nav className={styles.pagination}>
      <button
        className={styles.btn}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label={t("pagination.prev")}
      >
        ‹
      </button>

      {items.map((item) =>
        item.type === "dots" ? (
          <span key={item.key} className={styles.dots}>…</span>
        ) : (
          <button
            key={item.key}
            className={`${styles.btn} ${item.value === page ? styles.active : ""}`}
            onClick={() => onChange(item.value)}
          >
            {item.value}
          </button>
        )
      )}

      <button
        className={styles.btn}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label={t("pagination.next")}
      >
        ›
      </button>
    </nav>
  );
};

export default Pagination;
