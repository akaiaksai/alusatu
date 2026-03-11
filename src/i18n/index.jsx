import { createContext, useContext, useState, useCallback } from "react";
import ru from "./ru";
import en from "./en";
import kk from "./kk";

const translations = { ru, en, kk };
const LANG_KEY = "alu-satu-lang";
const defaultLang = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && translations[saved]) return saved;
  }
  return "ru";
};

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(defaultLang);

  const setLang = useCallback((code) => {
    if (translations[code]) {
      setLangState(code);
      localStorage.setItem(LANG_KEY, code);
    }
  }, []);

  const t = useCallback(
    (key, params) => {
      const keys = key.split(".");
      let value = translations[lang];
      for (const k of keys) {
        if (value == null) break;
        value = value[k];
      }
      if (value == null) {
        let fallback = translations.ru;
        for (const k of keys) {
          if (fallback == null) break;
          fallback = fallback[k];
        }
        value = fallback;
      }
      if (typeof value === "string" && params) {
        return value.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : `{${k}}`));
      }
      return value ?? key;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be inside I18nProvider");
  return ctx;
};

export default I18nProvider;
