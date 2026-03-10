import { Link } from "react-router-dom";
import styles from "./Info.module.css";
import { useTranslation } from "../../i18n";

const CookiePolicy = () => {
  const { t } = useTranslation();
  const tableRows = t("cookies.tableRows") || [];
  const s3Items = t("cookies.s3Items") || [];
  const s4Items = t("cookies.s4Items") || [];
  const s6Items = t("cookies.s6Items") || [];
  return (
  <div className={styles.page}>
    <div className={styles.breadcrumb}>
      <Link to="/">{t("cookies.breadcrumbHome")}</Link> / <span>{t("cookies.breadcrumbCookies")}</span>
    </div>

    <h1 className={styles.title}>{t("cookies.title")}</h1>
    <div className={styles.updated}>{t("cookies.updated")}</div>

    <div className={styles.section}>
      <h2>{t("cookies.s1Title")}</h2>
      <p>{t("cookies.s1P")}</p>
    </div>

    <div className={styles.section}>
      <h2>{t("cookies.s2Title")}</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("cookies.tableType")}</th>
            <th>{t("cookies.tablePurpose")}</th>
            <th>{t("cookies.tableDuration")}</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(tableRows) && tableRows.map((row, i) => (
            <tr key={i}>
              <td><strong>{row.type}</strong></td>
              <td>{row.purpose}</td>
              <td>{row.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className={styles.section}>
      <h2>{t("cookies.s3Title")}</h2>
      <p>{t("cookies.s3P")}</p>
      <ul>{Array.isArray(s3Items) && s3Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>

    <div className={styles.section}>
      <h2>{t("cookies.s4Title")}</h2>
      <p>{t("cookies.s4P")}</p>
      <ul>{Array.isArray(s4Items) && s4Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
      <div className={styles.highlight}>
        <p>{t("cookies.s4Highlight")}</p>
      </div>
    </div>

    <div className={styles.section}>
      <h2>{t("cookies.s5Title")}</h2>
      <p>{t("cookies.s5P")}</p>
    </div>

    <div className={styles.section}>
      <h2>{t("cookies.s6Title")}</h2>
      <p>{t("cookies.s6P")}</p>
      <ul>{Array.isArray(s6Items) && s6Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>
  </div>
  );
};

export default CookiePolicy;
