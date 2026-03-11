import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Sell.module.css";
import { createListedProduct } from "../../api/users.api";
import { useAuth } from "../../store";
import { useTranslation } from "../../i18n";

const categories = ["Телефоны", "Ноутбуки", "Одежда", "Обувь", "Часы", "Сумки", "Аксессуары", "Электроника", "Дом и сад"];

const LISTED_PRODUCTS_KEY = "listedProducts";

const readListedProducts = () => {
  try {
    const raw = localStorage.getItem(LISTED_PRODUCTS_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveListedProducts = (items) => {
  localStorage.setItem(LISTED_PRODUCTS_KEY, JSON.stringify(items));
};

const Sell = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Телефоны");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [, setImageFiles] = useState([]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(
      (file) => file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024
    );
    if (validFiles.length !== files.length) {
      setMsgType("error");
      setMsg(t("sell.invalidFiles"));
      return;
    }
    setImageFiles((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setImages((prev) => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setMsgType("");

    if (!title.trim() || !price) {
      setMsgType("error");
      setMsg(t("sell.enterNameAndPrice"));
      return;
    }
    if (!images.length) {
      setMsgType("error");
      setMsg(t("sell.addPhoto"));
      return;
    }
    if (!token) {
      setMsgType("error");
      setMsg(t("sell.loginToPublish"));
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        price: +price,
        category,
        description: description.trim(),
        images,
      };

      let product = null;
      let apiError = null;

      try {
        product = await createListedProduct(payload);
      } catch (err) {
        apiError = err;
        console.error("API create failed", err);
      }

      if (!product) {
        const localProduct = {
          id: `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          name: payload.title,
          title: payload.title,
          price: payload.price,
          category: payload.category,
          description: payload.description,
          image: payload.images[0] || "",
          images: payload.images,
          userId: user?.id || user?._id || "local-user",
          username: user?.username || "User",
          sold: false,
          createdAt: new Date().toISOString(),
        };

        const listed = readListedProducts();
        listed.unshift(localProduct);
        saveListedProducts(listed);
        product = localProduct;

        if (apiError) {
          const details = apiError?.response?.data?.error || apiError?.message || "API unavailable";
          console.warn("Saved listing locally after API failure:", details);
        }
      }

      if (!product) throw new Error("No product returned from API");

      setMsgType("success");
      setMsg(t("sell.published"));
      setTitle(""); 
      setPrice(""); 
      setCategory("Телефоны"); 
      setDescription(""); 
      setImages([]);
      setImageFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      window.dispatchEvent(new CustomEvent("myproducts:changed"));
      navigate(`/catalog?category=${encodeURIComponent(payload.category)}`);
      return;
    } catch (err) {
      console.error(err);
      setMsgType("error");
      const details = err?.response?.data?.error || err?.message || "";
      setMsg(details ? `${t("sell.publishError")} (${details})` : t("sell.publishError"));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{t("sell.title")}</h1>
        <p className={styles.subtitle}>{t("sell.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.label}>
            {t("sell.productName")} <span className={styles.required}>{t("sell.required")}</span>
          </label>
          <input 
            id="title"
            type="text" 
            placeholder={t("sell.productNamePlaceholder")} 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label htmlFor="price" className={styles.label}>
              {t("sell.price")} <span className={styles.required}>{t("sell.required")}</span>
            </label>
            <input 
              id="price"
              type="number" 
              placeholder="0" 
              value={price} 
              onChange={(e) => setPrice(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.label}>
              {t("sell.categoryLabel")}
            </label>
            <select 
              id="category"
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className={styles.select}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            {t("sell.photos")} <span className={styles.required}>{t("sell.required")}</span>
          </label>
          <div className={styles.uploadRow}>
            <label
              className={styles.uploadBtn}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                <path d="M16.5 19.5H7.5C5.01472 19.5 3 17.4853 3 15V9C3 6.51472 5.01472 4.5 7.5 4.5H8.37868C8.74456 4.5 9.09763 4.63214 9.36612 4.86612L10.6339 5.93388C10.9024 6.16786 11.2554 6.3 11.6213 6.3H16.5C18.9853 6.3 21 8.31472 21 10.8V15C21 17.4853 18.9853 19.5 16.5 19.5Z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>{t("sell.uploadPhoto")}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
            <span className={styles.uploadRowHint}>
              {t("sell.multipleFiles")}
            </span>
          </div>
          <div className={styles.thumbGrid}>
            {images.map((img, idx) => (
              <div key={idx} className={styles.thumbItem}>
                <img
                  src={img}
                  alt={`preview-${idx}`}
                  className={styles.thumbImg}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className={styles.thumbRemove}
                  aria-label={t("sell.removeImage")}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>
            {t("sell.descriptionLabel")}
          </label>
          <textarea 
            id="description"
            placeholder={t("sell.descriptionPlaceholder")} 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
            rows="6"
          />
        </div>

        <button type="submit" className={styles.submitBtn}>
          {t("sell.publish")}
        </button>
      </form>

      {msg && (
        <div className={`${styles.message} ${styles[msgType]}`}>
          {msg}
        </div>
      )}
    </div>
  );
};

export default Sell;
