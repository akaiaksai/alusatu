import React, { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./ProductCard.module.css";
import formatPrice from "../../utils/formatPrice";
import { useToast } from "../Toast/Toast";
import { useAuth, useCart, useFavorites } from "../../store";
import { useTranslation } from "../../i18n";
import { translateProduct } from "../../utils/productTranslation";

const getCategoryFallbackImage = (category, seed) => {
  const c = (category || "").toLowerCase();
  const sig = encodeURIComponent(String(seed ?? "0"));

  if (c.includes("телефон")) return `https://source.unsplash.com/featured/800x800?phone&sig=${sig}`;
  if (c.includes("ноут")) return `https://source.unsplash.com/featured/800x800?laptop&sig=${sig}`;
  if (c.includes("электрон")) return `https://source.unsplash.com/featured/800x800?electronics&sig=${sig}`;
  if (c.includes("одеж")) return `https://source.unsplash.com/featured/800x800?clothing&sig=${sig}`;
  if (c.includes("обув")) return `https://source.unsplash.com/featured/800x800?shoes&sig=${sig}`;
  if (c.includes("час")) return `https://source.unsplash.com/featured/800x800?watch&sig=${sig}`;
  if (c.includes("сум")) return `https://source.unsplash.com/featured/800x800?bag&sig=${sig}`;
  if (c.includes("аксесс")) return `https://source.unsplash.com/featured/800x800?accessories&sig=${sig}`;
  if (c.includes("дом") || c.includes("сад")) return `https://source.unsplash.com/featured/800x800?home&sig=${sig}`;

  return `https://source.unsplash.com/featured/800x800?product&sig=${sig}`;
};

const ProductCard = ({ product }) => {
  const toast = useToast();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { t } = useTranslation();
  const tp = translateProduct(product, t);
  const isBannedImage =
    typeof product?.image === "string" &&
    (product.image.includes("/sparkle.png") || /placeholder\.com/.test(product.image));

  const productIdKey = String(product?.id);

  const [isHidden, setIsHidden] = useState(() => !product?.image || isBannedImage);
  const [isFav, setIsFav] = useState(() => isFavorite(product?.id));

  const [imgSrc, setImgSrc] = useState(() => (isBannedImage ? "" : product.image));
  const [, setImgAttempt] = useState(0);

  const handleToggleFavorite = () => {
    if (!user) {
      toast(t("productCard.loginForFavorite"), "error");
      return;
    }
    const added = toggleFavorite(product.id);
    setIsFav(added);
    if (added) {
      toast(t("productCard.addedToFav"), "success");
    } else {
      toast(t("productCard.removedFromFav"), "info");
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      toast(t("productCard.loginForCart"), "error");
      return;
    }
    if (product.sold) {
      toast(t("productCard.alreadySold"), "error");
      return;
    }
    const result = addToCart(product, 1);
    if (result === "ALREADY_IN_CART") {
      toast(t("productCard.alreadyInCart"), "info");
      return;
    }
    toast(`${tp.name} ${t("productCard.addedToCart")}`, "success");
  };

  const handleImageError = () => {
    const apiImages = Array.isArray(product?.images) ? product.images : [];
    const fallbacks = [
      ...apiImages.filter((u) => typeof u === "string" && u.trim() && u.trim() !== imgSrc),
      getCategoryFallbackImage(product.category, `${product.id}-1`),
      getCategoryFallbackImage(product.category, `${product.id}-2`),
    ];

    setImgAttempt((attempt) => {
      if (attempt >= fallbacks.length) {
        setIsHidden(true);
        return attempt;
      }
      setImgSrc(fallbacks[attempt]);
      return attempt + 1;
    });
  };

  if (isHidden) return null;

  const discountPercent = product.discountPercentage ? Math.round(product.discountPercentage) : 0;
  const isNew = product.id && (typeof product.id === "number" ? product.id % 7 === 0 : false);

  return (
    <div className={`${styles.card} card-reveal`}>
      <div className={styles.imageWrap}>
        <div className={styles.badges}>
          {product.sold && (
            <span className={styles.badgeSold}>{t("productCard.sold")}</span>
          )}
          {discountPercent > 0 && (
            <span className={styles.badgeSale}>-{discountPercent}%</span>
          )}
          {isNew && <span className={styles.badgeNew}>New</span>}
        </div>

        <img
          src={imgSrc}
          alt={tp.name}
          className={styles.image}
          loading="lazy"
          onError={handleImageError}
        />
        <div className={styles.overlay}>
          <button
            type="button"
            aria-pressed={isFav}
            className={`${styles.overlayFav} ${isFav ? styles.overlayFavActive : ""}`}
            onClick={handleToggleFavorite}
            title={t("productCard.favorite")}
          >
            {isFav ? "★" : "☆"}
          </button>

          <Link to={`/product/${product.id}`} className={styles.overlayView} title={t("productCard.view")}>
            {t("productCard.view")}
          </Link>

          <button
            type="button"
            className={styles.overlayCart}
            onClick={handleAddToCart}
            title={t("productCard.addToCart")}
          >
            {t("productCard.addToCart")}
          </button>
        </div>
      </div>

      <div className={styles.details}>
        <h3 className={styles.name}>{tp.name}</h3>
        {tp.description && (
          <p className={styles.preview}>
            {tp.description.slice(0, 80)}
            {tp.description.length > 80 ? "…" : ""}
          </p>
        )}
        <p className={styles.price}>{formatPrice(product.price)}</p>
      </div>

      <div className={styles.actionsTop}>
        <button
          type="button"
          aria-pressed={isFav}
          className={`${styles.favBtn} ${isFav ? styles.favActive : ""}`}
          onClick={handleToggleFavorite}
          title={t("productCard.addToFavorite")}
        >
          {isFav ? "★" : "☆"}
        </button>

        <button
          type="button"
          className={styles.cartBtn}
          onClick={handleAddToCart}
          aria-label={t("productCard.addToCart")}
          title={t("productCard.addToCart")}
        >
          {t("productCard.addToCart")}
        </button>
      </div>

      <div className={styles.actionsBottom}>
        <Link to={`/product/${product.id}`} className={styles.viewBtn} title={t("productCard.view")} aria-label={t("productCard.view")}>
          {t("productCard.view")}
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
