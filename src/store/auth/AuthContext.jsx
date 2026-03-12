import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { getMe } from "../../api/auth.api";
import { updateProfile as apiUpdateProfile } from "../../api/users.api";

const AuthContext = createContext(null);

const normalizeUser = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id || raw._id || "";
  return {
    ...raw,
    id,
    _id: id,
    avatar: String(raw.avatar || ""),
  };
};

const readUser = () => {
  try { return normalizeUser(JSON.parse(localStorage.getItem("currentUser") || "null")); }
  catch { return null; }
};

const readToken = () => localStorage.getItem("token") || "";
const LOCAL_TOKEN_PREFIX = "local-auth-token:";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readUser);
  const [token, setToken] = useState(readToken);
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const login = useCallback((userData, tkn) => {
    const normalized = normalizeUser(userData);
    localStorage.setItem("currentUser", JSON.stringify(normalized));
    if (tkn) localStorage.setItem("token", tkn);
    setUser(normalized);
    setToken(tkn || "");
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    localStorage.removeItem("userAvatar");
    setUser(null);
    setToken("");
  }, []);

  const updateProfile = useCallback((data) => {
    const updated = normalizeUser({ ...(readUser() || {}), ...(data || {}) });
    localStorage.setItem("currentUser", JSON.stringify(updated));
    setUser(updated);
  }, []);

  const setAvatar = useCallback(async (src) => {
    const avatar = String(src || "");
    if (tokenRef.current) {
      try {
        const apiUser = await apiUpdateProfile({ avatar });
        updateProfile(apiUser);
      } catch {
        updateProfile({ avatar });
      }
    } else {
      updateProfile({ avatar });
    }
    window.dispatchEvent(new Event("avatar:changed"));
  }, [updateProfile]);

  const refreshUser = useCallback(() => {
    setUser(readUser());
    setToken(readToken());
  }, []);

  useEffect(() => {
    if (!token) return;

    getMe()
      .then((apiUser) => {
        const normalized = normalizeUser(apiUser);
        if (normalized) {
          localStorage.setItem("currentUser", JSON.stringify(normalized));
          setUser(normalized);
        }
      })
      .catch((err) => {
        const status = err?.response?.status;
        if ((status === 401 || status === 403) && !token.startsWith(LOCAL_TOKEN_PREFIX)) {
          localStorage.removeItem("token");
          localStorage.removeItem("currentUser");
          setToken("");
          setUser(null);
        }
      });
  }, [token]);

  const avatarSrc = String(user?.avatar || "");

  return (
    <AuthContext.Provider value={{ user, token, avatarSrc, login, logout, updateProfile, setAvatar, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
