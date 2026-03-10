import { Link } from "react-router-dom";
import styles from "./Info.module.css";
import { useTranslation } from "../../i18n";

const Security = () => {
  const { t } = useTranslation();
  const s2Items = t("security.s2Items") || [];
  return (
  <div className={styles.page}>
    <div className={styles.breadcrumb}>
      <Link to="/">{t("security.breadcrumbHome")}</Link> / <span>{t("security.breadcrumbSecurity")}</span>
    </div>

    <h1 className={styles.title}>{t("security.title")}</h1>
    <p className={styles.subtitle}>{t("security.subtitle")}</p>

    <div className={styles.section}>
      <h2>{t("security.s1Title")}</h2>
      <div className={styles.cardsGrid}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>{t("security.card1Icon")}</div>
          <h3>{t("security.card1Title")}</h3>
          <p>{t("security.card1Text")}</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>{t("security.card2Icon")}</div>
          <h3>{t("security.card2Title")}</h3>
          <p>{t("security.card2Text")}</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>{t("security.card3Icon")}</div>
          <h3>{t("security.card3Title")}</h3>
          <p>{t("security.card3Text")}</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>{t("security.card4Icon")}</div>
          <h3>{t("security.card4Title")}</h3>
          <p>{t("security.card4Text")}</p>
        </div>
      </div>
    </div>

    <div className={styles.section}>
      <h2>{t("security.s2Title")}</h2>
      <ul>{Array.isArray(s2Items) && s2Items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>

    <div className={styles.section}>
      <h2>{t("security.s3Title")}</h2>
      <div className={styles.steps}>
        <div className={styles.step}>
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepContent}>
            <h4>{t("security.step1Title")}</h4>
            <p>{t("security.step1Text")}</p>
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>2</div>
          <div className={styles.stepContent}>
            <h4>{t("security.step2Title")}</h4>
            <p>{t("security.step2Text")}</p>
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>3</div>
          <div className={styles.stepContent}>
            <h4>{t("security.step3Title")}</h4>
            <p>{t("security.step3Text")}</p>
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>4</div>
          <div className={styles.stepContent}>
            <h4>{t("security.step4Title")}</h4>
            <p>{t("security.step4Text")}</p>
          </div>
        </div>
      </div>
    </div>

    <div className={styles.section}>
      <h2>{t("security.s4Title")}</h2>
      <p>{t("security.s4P")}</p>
      <div className={styles.contactGrid}>
        <div className={styles.contactCard}>
          <div className={styles.cardIcon}>{t("security.contact1Icon")}</div>
          <h4>{t("security.contact1Title")}</h4>
          <p><a href="mailto:security@alu-satu.com">security@alu-satu.com</a></p>
        </div>
        <div className={styles.contactCard}>
          <div className={styles.cardIcon}>{t("security.contact2Icon")}</div>
          <h4>{t("security.contact2Title")}</h4>
          <p><a href="mailto:support@alu-satu.com">support@alu-satu.com</a></p>
        </div>
        <div className={styles.contactCard}>
          <div className={styles.cardIcon}>{t("security.contact3Icon")}</div>
          <h4>{t("security.contact3Title")}</h4>
          <p><a href="tel:+79999999999">+7 (999) 999-99-99</a></p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Security;
