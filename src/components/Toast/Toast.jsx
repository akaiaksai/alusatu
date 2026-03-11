import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import styles from "./Toast.module.css";
const ToastCtx = createContext(() => {});

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastCtx);
const ICONS = { success: "✓", error: "✕", info: "ℹ" };
const ToastItem = ({ toast, onRemove }) => {
  const [leaving, setLeaving] = useState(false);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div className={`${styles.toast} ${styles[toast.type] || styles.success} ${leaving ? styles.leaving : ""}`}>
      <span className={styles.icon}>{ICONS[toast.type] || ICONS.success}</span>
      <span className={styles.message}>{toast.text}</span>
      <button className={styles.close} onClick={dismiss}>×</button>
    </div>
  );
};
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const show = useCallback((text, type = "success", duration = 3000) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, text, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={styles.overlay}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

export default ToastProvider;
