import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../../api/auth.api";
import { useAuth } from "../../store";
import styles from "./Auth.module.css";
import { useTranslation } from "../../i18n";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!credential.trim() || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser({ credential: credential.trim(), password });
      login(data.user, data.token);
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error || t("auth.loginError");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <h1 className={styles.title}>{t("auth.loginTitle")}</h1>
      <p className={styles.subtitle}>{t("auth.loginSubtitle")}</p>

      {error && <p className={styles.error}>{error}</p>}

      <input
        className={styles.field}
        type="text"
        placeholder={t("auth.emailOrUsername")}
        value={credential}
        onChange={(e) => setCredential(e.target.value)}
        autoComplete="username"
      />
      <input
        className={styles.field}
        type="password"
        placeholder={t("auth.password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      <button className={styles.submitBtn} type="submit" disabled={loading}>
        {loading ? t("auth.loggingIn") : t("auth.loginBtn")}
      </button>

      <p className={styles.switchLink}>
        {t("auth.noAccount")} <Link to="/register">{t("auth.switchToRegister")}</Link>
      </p>
    </form>
  );
};

export default Login;
