import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

const readUser = () => {
  try { return JSON.parse(localStorage.getItem("currentUser") || "null"); }
  catch { return null; }
};

const readToken = () => localStorage.getItem("token") || "";
const readAvatar = () => localStorage.getItem("userAvatar") || "";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readUser);
  const [token, setToken] = useState(readToken);
  const [avatarSrc, setAvatarSrc] = useState(readAvatar);

  const login = useCallback((userData, tkn) => {
    localStorage.setItem("currentUser", JSON.stringify(userData));
    if (tkn) localStorage.setItem("token", tkn);
    setUser(userData);
    setToken(tkn || "");
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    setUser(null);
    setToken("");
  }, []);

  const updateProfile = useCallback((data) => {
    const updated = { ...readUser(), ...data };
    localStorage.setItem("currentUser", JSON.stringify(updated));
    setUser(updated);
  }, []);

  const setAvatar = useCallback((src) => {
    localStorage.setItem("userAvatar", src);
    setAvatarSrc(src);
    window.dispatchEvent(new Event("avatar:changed"));
  }, []);

  const refreshUser = useCallback(() => {
    setUser(readUser());
    setToken(readToken());
    setAvatarSrc(readAvatar());
  }, []);

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
