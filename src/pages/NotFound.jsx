import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n";

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "80vh",
      textAlign: "center",
      padding: "40px 20px",
      animation: "fadeUp 0.5s ease"
    }}>
      <span style={{
        fontSize: "8rem",
        fontWeight: 900,
        lineHeight: 1,
        background: "linear-gradient(135deg, #111, #555)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        marginBottom: "16px"
      }}>404</span>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0 0 12px" }}>
        {t("notFound.title")}
      </h1>
      <p style={{ color: "#888", fontSize: "1.05rem", maxWidth: 420, margin: "0 0 32px", lineHeight: 1.6 }}>
        {t("notFound.text")}
      </p>
      <button
        onClick={() => navigate("/")}
        style={{
          background: "#111",
          color: "#fff",
          border: "none",
          padding: "14px 40px",
          borderRadius: "12px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.2s, transform 0.2s"
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#333"; e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#111"; e.currentTarget.style.transform = "translateY(0)"; }}
      >
        {t("notFound.goHome")}
      </button>
    </div>
  );
};

export default NotFound;
