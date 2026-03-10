import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../../api/auth.api";
import { useAuth } from "../../store";
import styles from "./Auth.module.css";
import { useTranslation } from "../../i18n";

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email.trim() || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }
    if (password.length < 4) {
      setError(t("auth.passwordMinLength"));
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser({ username: username.trim(), email: email.trim(), password });
      login(data.user, data.token);
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error || t("auth.registerError");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <h1 className={styles.title}>{t("auth.registerTitle")}</h1>
      <p className={styles.subtitle}>{t("auth.registerSubtitle")}</p>

      {error && <p className={styles.error}>{error}</p>}

      <input
        className={styles.field}
        type="text"
        placeholder={t("auth.username")}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />
      <input
        className={styles.field}
        type="email"
        placeholder={t("auth.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <input
        className={styles.field}
        type="password"
        placeholder={t("auth.password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />

      <button className={styles.submitBtn} type="submit" disabled={loading}>
        {loading ? t("auth.registering") : t("auth.registerBtn")}
      </button>

      <p className={styles.switchLink}>
        {t("auth.hasAccount")} <Link to="/login">{t("auth.switchToLogin")}</Link>
      </p>
    </form>
  );
};

export default Register;
