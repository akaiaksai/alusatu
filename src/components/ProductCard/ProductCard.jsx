import React, { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./ProductCard.module.css";
import formatPrice from "../../utils/formatPrice";
import { useToast } from "../Toast/Toast";
import { useAuth, useCart, useFavorites } from "../../store";
import { useTranslation } from "../../i18n";
import { translateProduct } from "../../utils/productTranslation";

const getCategoryFallbackImage = (category, seed) => {
  const c = String(category || "").toLowerCase();
  const sig = encodeURIComponent(String(seed ?? "0"));

  if (/(phone|smart|\u0442\u0435\u043b\u0435\u0444\u043e\u043d)/i.test(c)) return `https://source.unsplash.com/featured/800x800?phone&sig=${sig}`;
  if (/(laptop|notebook|\u043d\u043e\u0443\u0442)/i.test(c)) return `https://source.unsplash.com/featured/800x800?laptop&sig=${sig}`;
  if (/(electronics|\u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d)/i.test(c)) return `https://source.unsplash.com/featured/800x800?electronics&sig=${sig}`;
  if (/(clothing|fashion|\u043e\u0434\u0435\u0436)/i.test(c)) return `https://source.unsplash.com/featured/800x800?clothing&sig=${sig}`;
  if (/(shoes|footwear|\u043e\u0431\u0443\u0432)/i.test(c)) return `https://source.unsplash.com/featured/800x800?shoes&sig=${sig}`;
  if (/(watch|\u0447\u0430\u0441)/i.test(c)) return `https://source.unsplash.com/featured/800x800?watch&sig=${sig}`;
  if (/(bag|\u0441\u0443\u043c)/i.test(c)) return `https://source.unsplash.com/featured/800x800?bag&sig=${sig}`;
  if (/(accessor|\u0430\u043a\u0441\u0435\u0441\u0441)/i.test(c)) return `https://source.unsplash.com/featured/800x800?accessories&sig=${sig}`;
  if (/(home|garden|\u0434\u043e\u043c|\u0441\u0430\u0434)/i.test(c)) return `https://source.unsplash.com/featured/800x800?home&sig=${sig}`;

  return `https://source.unsplash.com/featured/800x800?product&sig=${sig}`;
};

const HeartIcon = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12.1 20.3l-.1.1-.1-.1C7 15.8 4 13 4 9.8 4 7.3 5.9 5.4 8.4 5.4c1.5 0 2.9.7 3.8 1.9.9-1.2 2.3-1.9 3.8-1.9 2.5 0 4.4 1.9 4.4 4.4 0 3.2-3 6-7.9 10.5z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

  const [isHidden, setIsHidden] = useState(() => !product?.image || isBannedImage);
  const [isFav, setIsFav] = useState(() => isFavorite(product?.id));

  const [imgSrc, setImgSrc] = useState(() => (isBannedImage ? "" : product.image));
  const [, setImgAttempt] = useState(0);
  const ownListingError = "Вы не можете купить собственное объявление";
  const currentUserId = String(user?.id || user?._id || "");
  const ownerUserId = String(product?.userId || "");
  const isOwnListing = Boolean(currentUserId && ownerUserId && currentUserId === ownerUserId);

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
    if (isOwnListing) {
      toast(ownListingError, "error");
      return;
    }
    if (product.sold) {
      toast(t("productCard.alreadySold"), "error");
      return;
    }
    const result = addToCart(product, 1);
    if (result === "OWN_PRODUCT") {
      toast(ownListingError, "error");
      return;
    }
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
  const isUsed = /^[a-f0-9]{24}$/i.test(String(product?.id ?? ""));

  return (
    <div className={`${styles.card} card-reveal`}>
      {isUsed && !product.sold && (
        <span className={styles.ribbonUsed}>USED</span>
      )}
      <div className={styles.imageWrap}>
        <div className={styles.badges}>
          {product.sold && (
            <span className={styles.badgeSold}>{t("productCard.sold")}</span>
          )}
          {discountPercent > 0 && (
            <span className={styles.badgeSale}>-{discountPercent}%</span>
          )}
          {isNew && <span className={styles.badgeNew}>NEW</span>}
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
            <HeartIcon filled={isFav} />
          </button>

          <Link to={`/product/${product.id}`} className={styles.overlayView} title={t("productCard.view")}>
            {t("productCard.view")}
          </Link>

          <button
            type="button"
            className={styles.overlayCart}
            onClick={handleAddToCart}
            title={t("productCard.addToCart")}
            disabled={product.sold || isOwnListing}
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
            {tp.description.length > 80 ? "..." : ""}
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
          <HeartIcon filled={isFav} />
        </button>

        <button
          type="button"
          className={styles.cartBtn}
          onClick={handleAddToCart}
          aria-label={t("productCard.addToCart")}
          title={t("productCard.addToCart")}
          disabled={product.sold || isOwnListing}
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
