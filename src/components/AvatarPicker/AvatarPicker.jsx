import React, { useRef, useState } from "react";
import styles from "./AvatarPicker.module.css";
import { useTranslation } from "../../i18n";
const AVATAR_COLORS = [
  { bg: "#000000", fg: "#ffffff" },
  { bg: "#1a1a2e", fg: "#e94560" },
  { bg: "#16213e", fg: "#0f3460" },
  { bg: "#e94560", fg: "#ffffff" },
  { bg: "#533483", fg: "#ffffff" },
  { bg: "#0f3460", fg: "#e2e2e2" },
  { bg: "#2b2d42", fg: "#ef233c" },
  { bg: "#8d99ae", fg: "#2b2d42" },
  { bg: "#ef233c", fg: "#ffffff" },
  { bg: "#264653", fg: "#e9c46a" },
  { bg: "#2a9d8f", fg: "#ffffff" },
  { bg: "#e76f51", fg: "#ffffff" },
  { bg: "#f4a261", fg: "#264653" },
  { bg: "#6c584c", fg: "#f0ead2" },
  { bg: "#3a0ca3", fg: "#f72585" },
  { bg: "#4361ee", fg: "#ffffff" },
  { bg: "#7209b7", fg: "#f8f8f8" },
  { bg: "#560bad", fg: "#b5179e" },
  { bg: "#006d77", fg: "#83c5be" },
  { bg: "#e29578", fg: "#ffffff" },
];
const makeInitialAvatar = (initials, bg, fg) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="60" fill="${bg}"/>
    <text x="60" y="66" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="44" font-weight="800" fill="${fg}">${initials}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const makePatternAvatar = (bg, fg, patternIndex) => {
  const patterns = [

    `<line x1="0" y1="0" x2="120" y2="120" stroke="${fg}" stroke-width="12" opacity="0.3"/>
     <line x1="40" y1="0" x2="120" y2="80" stroke="${fg}" stroke-width="8" opacity="0.2"/>
     <line x1="0" y1="40" x2="80" y2="120" stroke="${fg}" stroke-width="8" opacity="0.2"/>`,

    `<circle cx="60" cy="60" r="30" fill="none" stroke="${fg}" stroke-width="6" opacity="0.4"/>
     <circle cx="60" cy="60" r="15" fill="${fg}" opacity="0.3"/>`,

    `<polygon points="60,15 105,60 60,105 15,60" fill="none" stroke="${fg}" stroke-width="5" opacity="0.4"/>
     <polygon points="60,35 85,60 60,85 35,60" fill="${fg}" opacity="0.2"/>`,

    `<circle cx="30" cy="30" r="6" fill="${fg}" opacity="0.3"/>
     <circle cx="60" cy="30" r="6" fill="${fg}" opacity="0.3"/>
     <circle cx="90" cy="30" r="6" fill="${fg}" opacity="0.3"/>
     <circle cx="30" cy="60" r="6" fill="${fg}" opacity="0.3"/>
     <circle cx="60" cy="60" r="10" fill="${fg}" opacity="0.4"/>
     <circle cx="90" cy="60" r="6" fill="${fg}" opacity="0.3"/>
     <circle cx="30" cy="90" r="6" fill="${fg}" opacity="0.3"/>
     <circle cx="60" cy="90" r="6" fill="${fg}" opacity="0.3"/>
     <circle cx="90" cy="90" r="6" fill="${fg}" opacity="0.3"/>`,

    `<line x1="60" y1="20" x2="60" y2="100" stroke="${fg}" stroke-width="10" opacity="0.3" stroke-linecap="round"/>
     <line x1="20" y1="60" x2="100" y2="60" stroke="${fg}" stroke-width="10" opacity="0.3" stroke-linecap="round"/>`,
  ];
  const pattern = patterns[patternIndex % patterns.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="60" fill="${bg}"/>
    <clipPath id="c"><circle cx="60" cy="60" r="60"/></clipPath>
    <g clip-path="url(#c)">${pattern}</g>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const generateAvatars = (initials) => {
  const list = [];

  AVATAR_COLORS.slice(0, 8).forEach((c) => {
    list.push({ type: "initials", src: makeInitialAvatar(initials, c.bg, c.fg), bg: c.bg, fg: c.fg });
  });

  AVATAR_COLORS.forEach((c, i) => {
    list.push({ type: "pattern", src: makePatternAvatar(c.bg, c.fg, i % 5), bg: c.bg, fg: c.fg });
  });
  return list;
};
const AvatarPicker = ({ currentAvatar, initials = "?", onSelect, onClose }) => {
  const avatars = generateAvatars(initials);
  const [selected, setSelected] = useState(currentAvatar || null);
  const fileRef = useRef(null);
  const { t } = useTranslation();

  const handleConfirm = () => {
    if (selected) onSelect(selected);
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(t("avatarPicker.maxSize"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setSelected(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{t("avatarPicker.title")}</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.uploadSection}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={handleFileChange}
          />
          <button className={styles.uploadBtn} onClick={() => fileRef.current?.click()}>
            {t("avatarPicker.uploadPhoto")}
          </button>
          <span className={styles.uploadHint}>{t("avatarPicker.uploadHint")}</span>
        </div>
        {selected && (
          <div className={styles.previewRow}>
            <img src={selected} alt="" className={styles.previewImg} />
            <span className={styles.previewLabel}>{t("avatarPicker.currentSelection")}</span>
          </div>
        )}

        <p className={styles.sectionLabel}>{t("avatarPicker.withInitials")}</p>
        <div className={styles.grid}>
          {avatars.filter((a) => a.type === "initials").map((a, i) => (
            <button
              key={`i-${i}`}
              className={`${styles.avatarOption} ${selected === a.src ? styles.avatarSelected : ""}`}
              onClick={() => setSelected(a.src)}
            >
              <img src={a.src} alt="" />
            </button>
          ))}
        </div>

        <p className={styles.sectionLabel}>{t("avatarPicker.patterns")}</p>
        <div className={styles.grid}>
          {avatars.filter((a) => a.type === "pattern").map((a, i) => (
            <button
              key={`p-${i}`}
              className={`${styles.avatarOption} ${selected === a.src ? styles.avatarSelected : ""}`}
              onClick={() => setSelected(a.src)}
            >
              <img src={a.src} alt="" />
            </button>
          ))}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>{t("avatarPicker.cancel")}</button>
          <button className={styles.confirmBtn} onClick={handleConfirm} disabled={!selected}>{t("avatarPicker.select")}</button>
        </div>
      </div>
    </div>
  );
};

export default AvatarPicker;
