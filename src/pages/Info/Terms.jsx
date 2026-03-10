import { Link } from "react-router-dom";
import styles from "./Info.module.css";
import { useTranslation } from "../../i18n";

const Terms = () => {
  const { t } = useTranslation();
  const s2Items = t("terms.s2Items") || [];
  const s3Items = t("terms.s3Items") || [];
  const s4Items = t("terms.s4Items") || [];
  const s5Items = t("terms.s5Items") || [];
  const s6Items = t("terms.s6Items") || [];
  const s8Items = t("terms.s8Items") || [];
  const s10Items = t("terms.s10Items") || [];
  return (
  <div className={styles.page}>
    <div className={styles.breadcrumb}>
      <Link to="/">{t("terms.breadcrumbHome")}</Link> / <span>{t("terms.breadcrumbTerms")}</span>
    </div>

    <h1 className={styles.title}>{t("terms.title")}</h1>
    <div className={styles.updated}>{t("terms.updated")}</div>

    <div className={styles.section}>
      <h2>{t("terms.s1Title")}</h2>
      <p>{t("terms.s1P1")}</p>
      <p>{t("terms.s1P2")}</p>
    </div>

    <div className={styles.section}>
      <h2>{t("terms.s2Title")}</h2>
      <ul>{Array.isArray(s2Items) && s2Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>

    <div className={styles.section}>
      <h2>{t("terms.s3Title")}</h2>
      <p>{t("terms.s3P")}</p>
      <ul>{Array.isArray(s3Items) && s3Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>

    <div className={styles.section}>
      <h2>{t("terms.s4Title")}</h2>
      <p>{t("terms.s4P")}</p>
      <ul>{Array.isArray(s4Items) && s4Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
      <p>{t("terms.s4P2")}</p>
    </div>

    <div className={styles.section}>
      <h2>{t("terms.s5Title")}</h2>
      <ul>{Array.isArray(s5Items) && s5Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>

    <div className={styles.section}>
      <h2>{t("terms.s6Title")}</h2>
      <ul>{Array.isArray(s6Items) && s6Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>

    <div className={styles.section}>
      <h2>{t("terms.s7Title")}</h2>
      <p>{t("terms.s7P1")}</p>
      <p>{t("terms.s7P2")}</p>
    </div>

    <div className={styles.section}>
      <h2>{t("terms.s8Title")}</h2>
      <p>{t("terms.s8P")}</p>
      <ul>{Array.isArray(s8Items) && s8Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>

    <div className={styles.section}>
      <h2>{t("terms.s9Title")}</h2>
      <p>{t("terms.s9P")}</p>
    </div>

    <div className={styles.section}>
      <h2>{t("terms.s10Title")}</h2>
      <p>{t("terms.s10P")}</p>
      <ul>{Array.isArray(s10Items) && s10Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>
  </div>
  );
};

export default Terms;
