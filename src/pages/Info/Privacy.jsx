import { Link } from "react-router-dom";
import styles from "./Info.module.css";
import { useTranslation } from "../../i18n";

const Privacy = () => {
  const { t } = useTranslation();
  const s2Items1 = t("privacy.s2Items1") || [];
  const s2Items2 = t("privacy.s2Items2") || [];
  const s3Items = t("privacy.s3Items") || [];
  const s4Items = t("privacy.s4Items") || [];
  const s5Items = t("privacy.s5Items") || [];
  const s6Items = t("privacy.s6Items") || [];
  const s7Items = t("privacy.s7Items") || [];
  const s9Items = t("privacy.s9Items") || [];
  return (
  <div className={styles.page}>
    <div className={styles.breadcrumb}>
      <Link to="/">{t("privacy.breadcrumbHome")}</Link> / <span>{t("privacy.breadcrumbPrivacy")}</span>
    </div>

    <h1 className={styles.title}>{t("privacy.title")}</h1>
    <div className={styles.updated}>{t("privacy.updated")}</div>

    <div className={styles.section}>
      <h2>{t("privacy.s1Title")}</h2>
      <p>{t("privacy.s1P")}</p>
    </div>

    <div className={styles.section}>
      <h2>{t("privacy.s2Title")}</h2>
      <h3>{t("privacy.s2Sub1")}</h3>
      <ul>{Array.isArray(s2Items1) && s2Items1.map((item, i) => <li key={i}>{item}</li>)}</ul>
      <h3>{t("privacy.s2Sub2")}</h3>
      <ul>
        {Array.isArray(s2Items2) && s2Items2.map((item, i) => (
          <li key={i}>{i === s2Items2.length - 1 ? (
            <>{item.split("—")[0]}— <Link to="/cookies" style={{ color: "#000", fontWeight: 600 }}>{item.split("—")[1]?.trim()}</Link></>
          ) : item}</li>
        ))}
      </ul>
    </div>

    <div className={styles.section}>
      <h2>{t("privacy.s3Title")}</h2>
      <p>{t("privacy.s3P")}</p>
      <ul>{Array.isArray(s3Items) && s3Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>

    <div className={styles.section}>
      <h2>{t("privacy.s4Title")}</h2>
      <p>{t("privacy.s4P")}</p>
      <ul>{Array.isArray(s4Items) && s4Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
      <div className={styles.highlight}>
        <p>{t("privacy.s4Highlight")}</p>
      </div>
    </div>

    <div className={styles.section}>
      <h2>{t("privacy.s5Title")}</h2>
      <ul>{Array.isArray(s5Items) && s5Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>

    <div className={styles.section}>
      <h2>{t("privacy.s6Title")}</h2>
      <p>{t("privacy.s6P")}</p>
      <ul>{Array.isArray(s6Items) && s6Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>

    <div className={styles.section}>
      <h2>{t("privacy.s7Title")}</h2>
      <p>{t("privacy.s7P")}</p>
      <ul>{Array.isArray(s7Items) && s7Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
      <p>
        {t("privacy.s7Contact")}{" "}
        <a href="mailto:privacy@alu-satu.com" style={{ color: "#000", fontWeight: 600 }}>
          privacy@alu-satu.com
        </a>
      </p>
    </div>

    <div className={styles.section}>
      <h2>{t("privacy.s8Title")}</h2>
      <p>{t("privacy.s8P")}</p>
    </div>

    <div className={styles.section}>
      <h2>{t("privacy.s9Title")}</h2>
      <ul>{Array.isArray(s9Items) && s9Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>
  </div>
  );
};

export default Privacy;
