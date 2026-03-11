import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n";
import styles from "./NotFound.module.css";

const LANGS = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "kk", label: "KK" },
];

const NotFound = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>{t("notFound.title")}</h1>
      <p className={styles.text}>{t("notFound.text")}</p>
      <button className={styles.btn} onClick={() => navigate("/")}>
        {t("notFound.goHome")}
      </button>
      <div className={styles.langRow}>
        {LANGS.map((o) => (
          <button
            key={o.code}
            className={`${styles.langBtn} ${lang === o.code ? styles.langBtnActive : ""}`}
            onClick={() => setLang(o.code)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NotFound;
