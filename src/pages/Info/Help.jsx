import { Link } from "react-router-dom";
import styles from "./Info.module.css";
import { useTranslation } from "../../i18n";

const Help = () => {
  const { t } = useTranslation();
  return (
  <div className={styles.page}>
    <div className={styles.breadcrumb}>
      <Link to="/">{t("help.breadcrumbHome")}</Link> / <span>{t("help.breadcrumbHelp")}</span>
    </div>

    <h1 className={styles.title}>{t("help.title")}</h1>
    <p className={styles.subtitle}>{t("help.subtitle")}</p>
    <div className={styles.section} id="how-to-buy">
      <h2>{t("help.howToBuyTitle")}</h2>
      <p>{t("help.howToBuyIntro")}</p>
      <div className={styles.steps}>
        <div className={styles.step}>
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepContent}>
            <h4>{t("help.step1Title")}</h4>
            <p>{t("help.step1Text")}</p>
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>2</div>
          <div className={styles.stepContent}>
            <h4>{t("help.step2Title")}</h4>
            <p>{t("help.step2Text")}</p>
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>3</div>
          <div className={styles.stepContent}>
            <h4>{t("help.step3Title")}</h4>
            <p>{t("help.step3Text")}</p>
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>4</div>
          <div className={styles.stepContent}>
            <h4>{t("help.step4Title")}</h4>
            <p>{t("help.step4Text")}</p>
          </div>
        </div>
      </div>
    </div>
    <div className={styles.section} id="how-to-sell">
      <h2>{t("help.howToSellTitle")}</h2>
      <p>{t("help.howToSellIntro")}</p>
      <div className={styles.steps}>
        <div className={styles.step}>
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepContent}>
            <h4>{t("help.sellStep1Title")}</h4>
            <p>{t("help.sellStep1Text")}</p>
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>2</div>
          <div className={styles.stepContent}>
            <h4>{t("help.sellStep2Title")}</h4>
            <p>{t("help.sellStep2Text")}</p>
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>3</div>
          <div className={styles.stepContent}>
            <h4>{t("help.sellStep3Title")}</h4>
            <p>{t("help.sellStep3Text")}</p>
          </div>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNumber}>4</div>
          <div className={styles.stepContent}>
            <h4>{t("help.sellStep4Title")}</h4>
            <p>{t("help.sellStep4Text")}</p>
          </div>
        </div>
      </div>
    </div>
    <div className={styles.section} id="delivery">
      <h2>{t("help.deliveryTitle")}</h2>
      <h3>{t("help.deliverySubtitle")}</h3>
      <ul>
        <li>{t("help.delivery1")}</li>
        <li>{t("help.delivery2")}</li>
        <li>{t("help.delivery3")}</li>
        <li>{t("help.delivery4")}</li>
        <li>{t("help.delivery5")}</li>
      </ul>

      <h3>{t("help.returnSubtitle")}</h3>
      <ul>
        <li>{t("help.return1")}</li>
        <li>{t("help.return2")}</li>
        <li>{t("help.return3")}</li>
        <li>{t("help.return4")}</li>
        <li>{t("help.return5")}</li>
      </ul>
    </div>
    <div className={styles.section} id="find-order">
      <h2>{t("help.findOrderTitle")}</h2>
      <p>
        {t("help.findOrderText1")}{" "}
        <Link to="/profile" style={{ color: "#000", fontWeight: 600 }}>
          {t("help.findOrderLink")}
        </Link>{" "}
        {t("help.findOrderText2")}
      </p>
      <div className={styles.highlight}>
        <p>{t("help.findOrderHint")}</p>
      </div>
    </div>
    <div className={styles.section}>
      <h2>{t("help.faqTitle")}</h2>
      <h3>{t("help.faq1Q")}</h3>
      <p>{t("help.faq1A")}</p>

      <h3>{t("help.faq2Q")}</h3>
      <p>{t("help.faq2A")}</p>

      <h3>{t("help.faq3Q")}</h3>
      <p>
        {t("help.faq3A")}{" "}
        <Link to="/security" style={{ color: "#000", fontWeight: 600 }}>
          {t("help.faq3Link")}
        </Link>
        .
      </p>

      <h3>{t("help.faq4Q")}</h3>
      <p>{t("help.faq4A")}</p>
    </div>
    <div className={styles.section}>
      <h2>{t("help.contactsTitle")}</h2>
      <div className={styles.contactGrid}>
        <div className={styles.contactCard}>
          <div className={styles.cardIcon}>@</div>
          <h4>{t("help.contactEmail")}</h4>
          <p><a href="mailto:support@alu-satu.com">support@alu-satu.com</a></p>
        </div>
        <div className={styles.contactCard}>
          <div className={styles.cardIcon}>☎</div>
          <h4>{t("help.contactPhone")}</h4>
          <p><a href="tel:+79999999999">+7 (999) 999-99-99</a></p>
        </div>
        <div className={styles.contactCard}>
          <div className={styles.cardIcon}>TG</div>
          <h4>{t("help.contactTelegram")}</h4>
          <p><a href="https://t.me/akaiaksai" target="_blank" rel="noreferrer">@akaiaksai</a></p>
        </div>
        <div className={styles.contactCard}>
          <div className={styles.cardIcon}>⏰</div>
          <h4>{t("help.contactHours")}</h4>
          <p>{t("help.contactHoursValue")}</p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Help;
