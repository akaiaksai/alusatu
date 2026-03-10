import { Link } from "react-router-dom";
import styles from "./Info.module.css";
import { useTranslation } from "../../i18n";

const About = () => {
  const { t } = useTranslation();
  return (
  <div className={styles.page}>
    <div className={styles.breadcrumb}>
      <Link to="/">{t("about.breadcrumbHome")}</Link> / <span>{t("about.breadcrumbAbout")}</span>
    </div>

    <h1 className={styles.title}>{t("about.title")}</h1>
    <p className={styles.subtitle}>{t("about.subtitle")}</p>

    <div className={styles.section}>
      <h2>{t("about.missionTitle")}</h2>
      <p>{t("about.missionText")}</p>
      <div className={styles.highlight}>
        <p>{t("about.missionHighlight")}</p>
      </div>
    </div>

    <div className={styles.section}>
      <h2>{t("about.numbersTitle")}</h2>
      <div className={styles.cardsGrid}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>ТВ</div>
          <h3>{t("about.stat1Title")}</h3>
          <p>{t("about.stat1Desc")}</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>ПЛ</div>
          <h3>{t("about.stat2Title")}</h3>
          <p>{t("about.stat2Desc")}</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>ДС</div>
          <h3>{t("about.stat3Title")}</h3>
          <p>{t("about.stat3Desc")}</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>★</div>
          <h3>{t("about.stat4Title")}</h3>
          <p>{t("about.stat4Desc")}</p>
        </div>
      </div>
    </div>

    <div className={styles.section}>
      <h2>{t("about.historyTitle")}</h2>
      <p>{t("about.historyText1")}</p>
      <p>{t("about.historyText2")}</p>
    </div>

    <div className={styles.section}>
      <h2>{t("about.teamTitle")}</h2>
      <p>{t("about.teamSubtitle")}</p>
      <div className={styles.teamGrid}>
        <div className={styles.teamCard}>
          <div className={styles.teamAvatar}>АД</div>
          <h4>{t("about.team1Name")}</h4>
          <p>{t("about.team1Role")}</p>
        </div>
        <div className={styles.teamCard}>
          <div className={styles.teamAvatar}>ПМ</div>
          <h4>{t("about.team2Name")}</h4>
          <p>{t("about.team2Role")}</p>
        </div>
        <div className={styles.teamCard}>
          <div className={styles.teamAvatar}>ЖН</div>
          <h4>{t("about.team3Name")}</h4>
          <p>{t("about.team3Role")}</p>
        </div>
      </div>
    </div>

    <div className={styles.section}>
      <h2>{t("about.careerTitle")}</h2>
      <p>{t("about.careerText")}</p>
      <div className={styles.cardsGrid}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>FE</div>
          <h3>{t("about.job1Title")}</h3>
          <p>{t("about.job1Desc")}</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>DA</div>
          <h3>{t("about.job2Title")}</h3>
          <p>{t("about.job2Desc")}</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>RN</div>
          <h3>{t("about.job3Title")}</h3>
          <p>{t("about.job3Desc")}</p>
        </div>
      </div>
      <p>
        {t("about.sendResume")}{" "}
        <a href="mailto:hr@alu-satu.com" style={{ color: "#000", fontWeight: 600 }}>
          hr@alu-satu.com
        </a>
      </p>
    </div>

    <div className={styles.section}>
      <h2>{t("about.pressTitle")}</h2>
      <p>
        {t("about.pressText")}{" "}
        <a href="mailto:press@alu-satu.com" style={{ color: "#000", fontWeight: 600 }}>
          press@alu-satu.com
        </a>
        {t("about.pressText2")}
      </p>
    </div>
  </div>
  );
};

export default About;
