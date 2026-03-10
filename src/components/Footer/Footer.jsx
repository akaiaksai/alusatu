import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Footer.module.css";
import { useTranslation } from "../../i18n";

const Newsletter = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setErrorMsg(t("newsletter.invalidEmail"));
      setStatus("error");
      setTimeout(() => { setStatus("idle"); setErrorMsg(""); }, 3000);
      return;
    }
    setStatus("loading");
    try {
      await new Promise((r) => setTimeout(r, 800));
      localStorage.setItem("alu-satu-subscribed", trimmed);
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      setErrorMsg(t("newsletter.error"));
      setTimeout(() => { setStatus("idle"); setErrorMsg(""); }, 3000);
    }
  };

  return (
    <section className={styles.newsletterSection}>
      <div className={styles.newsletter}>
        <div className={styles.newsletterContent}>
          <h3 className={styles.newsletterTitle}>{t("newsletter.title")}</h3>
          <p className={styles.newsletterText}>{t("newsletter.text")}</p>
        </div>
        <form className={styles.newsletterForm} onSubmit={handleSubscribe}>
          <input
            type="email"
            placeholder={t("newsletter.placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.newsletterInput}
            disabled={status === "loading"}
          />
          <button type="submit" className={styles.newsletterBtn} disabled={status === "loading"}>
            {status === "loading" ? "..." : status === "success" ? t("newsletter.done") : t("newsletter.subscribe")}
          </button>
        </form>
        {status === "error" && <p className={styles.newsletterError}>{errorMsg}</p>}
        {status === "success" && <p className={styles.newsletterSuccess}>{t("newsletter.success")}</p>}
      </div>
    </section>
  );
};

const Footer = () => {
  const { t } = useTranslation();
  return (
    <>
    <Newsletter />
    <footer className={styles.footer}>

      <div className={styles.content}>
        <div className={styles.column}>
          <div className={styles.footerBrand}>Alu-Satu</div>
          <p className={styles.footerDesc}>{t("footer.desc")}</p>
          <div className={styles.social}>
            <a href="https://www.tiktok.com/@akaiaksai" target="_blank" rel="noreferrer" title="TikTok">TT</a>
            <a href="https://www.instagram.com/akaiaksai" target="_blank" rel="noreferrer" title="Instagram">IG</a>
            <a href="https://t.me/akaiaksai" target="_blank" rel="noreferrer" title="Telegram">TG</a>
          </div>
        </div>

        <div className={styles.column}>
          <h4>{t("footer.aboutCompany")}</h4>
          <ul>
            <li><Link to="/about">{t("footer.aboutUs")}</Link></li>
            <li><Link to="/about">{t("footer.history")}</Link></li>
            <li><Link to="/about">{t("footer.careers")}</Link></li>
            <li><Link to="/about">{t("footer.pressCenter")}</Link></li>
          </ul>
        </div>

        <div className={styles.column}>
          <h4>{t("footer.help")}</h4>
          <ul>
            <li><Link to="/help">{t("footer.helpCenter")}</Link></li>
            <li><Link to="/help#how-to-buy">{t("footer.howToBuy")}</Link></li>
            <li><Link to="/help#how-to-sell">{t("footer.howToSell")}</Link></li>
            <li><Link to="/help#delivery">{t("footer.deliveryAndReturn")}</Link></li>
          </ul>
        </div>

        <div className={styles.column}>
          <h4>{t("footer.legal")}</h4>
          <ul>
            <li><Link to="/terms">{t("footer.terms")}</Link></li>
            <li><Link to="/privacy">{t("footer.privacy")}</Link></li>
            <li><Link to="/cookies">{t("footer.cookies")}</Link></li>
            <li><Link to="/security">{t("footer.security")}</Link></li>
          </ul>
        </div>

        <div className={styles.column}>
          <h4>{t("footer.contacts")}</h4>
          <ul>
            <li><a href="mailto:support@alu-satu.com">support@alu-satu.com</a></li>
            <li><a href="tel:+79999999999">+7 (999) 999-99-99</a></li>
            <li>{t("footer.address")}</li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>{t("footer.copyright")}</p>
      </div>
    </footer>
    </>
  );
};

export default Footer;
