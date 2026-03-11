import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import styles from "./Header.module.css";
import searchIcon from "../../assets/icons/search.svg";
import cartIcon from "../../assets/icons/cart.svg";
import { loginUser, registerUser, logout as apiLogout } from "../../api/auth.api";
import { useAuth, useCart, useFavorites } from "../../store";
import { useTranslation } from "../../i18n";

const LANG_OPTIONS = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "kk", label: "KK" },
];

const Header = ({ theme, onToggleTheme }) => {
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const { user, avatarSrc, login, logout: authLogout } = useAuth();
  const { cartCount } = useCart();
  const { favCount } = useFavorites();
  const { t, lang, setLang } = useTranslation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const location = useLocation();

  useEffect(() => {
    closeMenu(); 
  }, [location.pathname, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    apiLogout();
    authLogout();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`} ref={headerRef}>
        <div className={styles.logo}>
          <Link to="/" className={styles.logoLink}>Alu Satu</Link>
        </div>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input
            type="text"
            placeholder={t("header.searchPlaceholder")}
            className={styles.searchInput}
            aria-label={t("header.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className={styles.searchButton} title={t("header.search")} aria-label={t("header.search")}>
            <img src={searchIcon} alt={t("header.search")} className={styles.searchIcon} />
          </button>
        </form>

        <nav className={styles.navIcons}>
          <Link to="/sell" className={styles.sellBtn} title={t("header.sellTitle")} aria-label={t("header.sellTitle")}>
            <span>{t("header.sell")}</span>
          </Link>
          <Link to="/favorites" className={styles.iconBtn} aria-label={t("header.favorites")} title={t("header.favorites")}>
            <span className={styles.favIcon}>★</span>
            {favCount > 0 && <span className={styles.favBadge}>{favCount}</span>}
          </Link>
          <Link to="/cart" className={styles.iconBtn} aria-label={t("header.cart")} title={t("header.cart")}>
            <img src={cartIcon} alt={t("header.cart")} className={styles.cartImg} />
            {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
          </Link>
          {user ? (
            <div className={styles.userMenu}>
              <Link to={user.isAdmin ? "/admin" : "/profile"} className={styles.headerAvatar} title={user.isAdmin ? t("header.adminPanel") : t("header.profile")} aria-label={t("header.profile")}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className={styles.headerAvatarImg} />
                ) : (
                  <span className={styles.avatarInitials}>{(user.username || "?").slice(0, 2).toUpperCase()}</span>
                )}
              </Link>
              <Link to="/profile" className={styles.usernameLink} title={t("header.profile")} aria-label={t("header.profile")}>
                <span className={styles.username}>{user.username || user.email}</span>
              </Link>
              <button onClick={handleLogout} className={styles.logoutBtn}>{t("header.logout")}</button>
              <div className={styles.langSwitcher}>
                <button className={styles.langBtn} onClick={() => setShowLangMenu(v => !v)} type="button" title={t("lang." + lang)}>{lang.toUpperCase()}</button>
                {showLangMenu && (
                  <div className={styles.langDropdown}>
                    {LANG_OPTIONS.map(o => (
                      <button key={o.code} className={`${styles.langOption} ${lang === o.code ? styles.langActive : ""}`} onClick={() => { setLang(o.code); setShowLangMenu(false); }}>{o.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className={styles.themeToggleBtn}
                onClick={onToggleTheme}
                aria-label={theme === "dark" ? t("header.enableLightTheme") : t("header.enableDarkTheme")}
                title={theme === "dark" ? t("header.lightTheme") : t("header.darkTheme")}
                type="button"
              >
                {theme === "dark" ? "🌞" : "🌙"}
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => {
                  setShowAuthModal(true);
                  setAuthMode("login");
                }}
                className={styles.authBtn}
                aria-label={t("header.login")}
                title={t("header.loginTitle")}
              >
                {t("header.login")}
              </button>
              <div className={styles.langSwitcher}>
                <button className={styles.langBtn} onClick={() => setShowLangMenu(v => !v)} type="button" title={t("lang." + lang)}>{lang.toUpperCase()}</button>
                {showLangMenu && (
                  <div className={styles.langDropdown}>
                    {LANG_OPTIONS.map(o => (
                      <button key={o.code} className={`${styles.langOption} ${lang === o.code ? styles.langActive : ""}`} onClick={() => { setLang(o.code); setShowLangMenu(false); }}>{o.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className={styles.themeToggleBtn}
                onClick={onToggleTheme}
                aria-label={theme === "dark" ? t("header.enableLightTheme") : t("header.enableDarkTheme")}
                title={theme === "dark" ? t("header.lightTheme") : t("header.darkTheme")}
                type="button"
              >
                {theme === "dark" ? "🌞" : "🌙"}
              </button>
            </>
          )}
        </nav>

        <div className={styles.mobileControls}>
          <div className={styles.mobileLang}>
            <button className={styles.langBtn} onClick={() => setShowLangMenu(v => !v)} type="button" title={t("lang." + lang)}>{lang.toUpperCase()}</button>
            {showLangMenu && (
              <div className={styles.langDropdown}>
                {LANG_OPTIONS.map(o => (
                  <button key={o.code} className={`${styles.langOption} ${lang === o.code ? styles.langActive : ""}`} onClick={() => { setLang(o.code); setShowLangMenu(false); }}>{o.label}</button>
                ))}
              </div>
            )}
          </div>
          <button
            className={styles.themeToggleBtn}
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? t("header.enableLightTheme") : t("header.enableDarkTheme")}
            title={theme === "dark" ? t("header.lightTheme") : t("header.darkTheme")}
            type="button"
          >
            {theme === "dark" ? "🌞" : "🌙"}
          </button>
          <button
            className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t("header.menu")}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

      </header>

      <div className={`${styles.drawerOverlay} ${menuOpen ? styles.drawerOverlayOpen : ""}`} onClick={closeMenu} />
      <div className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Alu Satu</span>
          <button className={styles.drawerCloseBtn} onClick={closeMenu} aria-label={t("header.menu")}>
            <span />
            <span />
          </button>
        </div>
        <div className={styles.drawerContent}>
          <Link to="/sell" className={styles.drawerLink} onClick={closeMenu}>{t("header.sell")}</Link>
          <Link to="/favorites" className={styles.drawerLink} onClick={closeMenu}>
            {t("header.favorites")} {favCount > 0 && <span className={styles.drawerBadge}>{favCount}</span>}
          </Link>
          <Link to="/cart" className={styles.drawerLink} onClick={closeMenu}>
            {t("header.cart")} {cartCount > 0 && <span className={styles.drawerBadge}>{cartCount}</span>}
          </Link>
          <Link to="/catalog" className={styles.drawerLink} onClick={closeMenu}>{t("header.catalog")}</Link>
          {user ? (
            <>
              <Link to={user.isAdmin ? "/admin" : "/profile"} className={styles.drawerLink} onClick={closeMenu}>
                {user.isAdmin ? t("header.adminPanel") : t("header.profile")}
              </Link>
              <button onClick={() => { handleLogout(); closeMenu(); }} className={styles.drawerLogout}>{t("header.logout")}</button>
            </>
          ) : (
            <button onClick={() => { setShowAuthModal(true); setAuthMode("login"); closeMenu(); }} className={styles.drawerAuth}>
              {t("header.login")}
            </button>
          )}
        </div>
      </div>

      {showAuthModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAuthModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setShowAuthModal(false)}>✕</button>
            <div className={styles.brand}>Alu Satu</div>
            {authMode === "login" ? (
              <LoginForm 
                onSuccess={(userData, tkn) => {
                  login(userData, tkn);
                  setShowAuthModal(false);
                  navigate("/profile");
                }} 
                onSwitchMode={() => setAuthMode("register")}
              />
            ) : (
              <RegisterForm 
                onSuccess={(userData, tkn) => {
                  login(userData, tkn);
                  setShowAuthModal(false);
                  navigate("/profile");
                }} 
                onSwitchMode={() => setAuthMode("login")}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

function LoginForm({ onSuccess, onSwitchMode }) {
  const [credential, setCredential] = useState(""); 
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!credential || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }
    setLoading(true);
    setError("");

    try {

      const data = await loginUser({ credential, password });
      const u = data.user;
      const userData = { email: u.email, id: u._id, username: u.username, isAdmin: u.isAdmin };
      onSuccess(userData, data.token);
    } catch (apiErr) {
      const serverMsg = apiErr?.response?.data?.error;
      setError(serverMsg || t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className={styles.authForm}>
      <h2>{t("auth.loginTitle")}</h2>
      <input
        type="text"
        placeholder={t("auth.emailOrUsername")}
        value={credential}
        onChange={(e) => setCredential(e.target.value)}
        className={styles.authInput}
        autoFocus
      />
      <div className={styles.passwordRow}>
        <input
          type={showPassword ? "text" : "password"}
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.authInput}
        />
        <button
          type="button"
          className={styles.showPwdBtn}
          onClick={() => setShowPassword(s => !s)}
          aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
        >
          {showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
        </button>
      </div>
      {error && <p className={styles.authError}>{error}</p>}
      <button type="submit" className={styles.authSubmitBtn} disabled={loading}>{loading ? t("auth.loggingIn") : t("auth.loginBtn")}</button>
      <p className={styles.authSwitch}>
        {t("auth.noAccount")} <button type="button" onClick={onSwitchMode} className={styles.switchLink}>{t("auth.switchToRegister")}</button>
      </p>
    </form>
  );
}

function RegisterForm({ onSuccess, onSwitchMode }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      setError(t("auth.fillAllFields"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    setLoading(true);
    setError("");

    try {

      const data = await registerUser({ username, email, password });
      const u = data.user;
      const userData = { email: u.email, id: u._id, username: u.username, isAdmin: u.isAdmin };
      onSuccess(userData, data.token);
    } catch (apiErr) {
      const serverMsg = apiErr?.response?.data?.error;
      setError(serverMsg || t("auth.registerError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className={styles.authForm}>
      <h2>{t("auth.registerTitle")}</h2>
      <input
        type="text"
        placeholder={t("auth.username")}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className={styles.authInput}
        autoFocus
      />
      <input
        type="email"
        placeholder={t("auth.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={styles.authInput}
      />
      <div className={styles.passwordRow}>
        <input
          type={showPassword ? "text" : "password"}
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.authInput}
        />
        <button
          type="button"
          className={styles.showPwdBtn}
          onClick={() => setShowPassword(s => !s)}
          aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
        >
          {showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
        </button>
      </div>
      <div className={styles.passwordRow}>
        <input
          type={showConfirmPassword ? "text" : "password"}
          placeholder={t("auth.confirmPassword")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.authInput}
        />
        <button
          type="button"
          className={styles.showPwdBtn}
          onClick={() => setShowConfirmPassword(s => !s)}
          aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
        >
          {showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
        </button>
      </div>
      {error && <p className={styles.authError}>{error}</p>}
      <button type="submit" className={styles.authSubmitBtn} disabled={loading}>{loading ? t("auth.registering") : t("auth.registerBtn")}</button>
      <p className={styles.authSwitch}>
        {t("auth.hasAccount")} <button type="button" onClick={onSwitchMode} className={styles.switchLink}>{t("auth.switchToLogin")}</button>
      </p>
    </form>
  );
}

export default Header;

