import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { mockProducts } from "../../data/mockProducts";
import styles from "./Product.module.css";
import formatPrice from "../../utils/formatPrice";
import {
  getListedProductById,
  getProductReviews,
  createProductReview,
  deleteProductReview,
} from "../../api/users.api";
import { useToast } from "../../components/Toast/Toast";
import { useAuth, useCart, useFavorites } from "../../store";
import { useTranslation } from "../../i18n";
import { translateProduct } from "../../utils/productTranslation";

const getFallbackImage = (seed) => `https://source.unsplash.com/featured/900x900?product&sig=${encodeURIComponent(String(seed ?? "0"))}`;
const isNumericId = (value) => /^[0-9]+$/.test(String(value ?? "").trim());
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const SWIPE_THRESHOLD = 42;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const getTouchDistance = (touches) => {
  if (!touches || touches.length < 2) return 0;
  const [a, b] = touches;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
};

const findListedProductById = (routeId) => {
  try {
    const raw = localStorage.getItem("listedProducts") || "[]";
    const listed = JSON.parse(raw);
    const rid = String(routeId);
    return (listed || []).find((p) => String(p?.id) === rid) || null;
  } catch {
    return null;
  }
};
const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const StarIcon = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 3.8l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 16.14 7.2 18.56l.92-5.34L4.24 9.44l5.36-.78L12 3.8z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const StarRating = ({ rating, onRate, interactive = false, size = 20 }) => (
  <div className={styles.stars} style={{ "--star-size": `${size}px` }}>
    {[1, 2, 3, 4, 5].map((star) =>
      interactive ? (
        <button
          key={star}
          type="button"
          className={`${styles.star} ${star <= rating ? styles.starFilled : ""}`}
          onClick={() => onRate(star)}
          aria-label={`Rate ${star}`}
        >
          <StarIcon filled={star <= rating} />
        </button>
      ) : (
        <span key={star} className={`${styles.star} ${star <= rating ? styles.starFilled : ""}`}>
          <StarIcon filled={star <= rating} />
        </span>
      ),
    )}
  </div>
);

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

const ZoomIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M16 16l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const Product = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [images, setImages] = useState([]);
  const [slideDir, setSlideDir] = useState(1);
  const [isFav, setIsFav] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState("description");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);

  const imgRef = useRef(null);
  const viewerStageRef = useRef(null);
  const panRef = useRef({ x: 0, y: 0 });
  const touchRef = useRef(null);

  const toast = useToast();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { t } = useTranslation();
  const tp = product ? translateProduct(product, t) : null;
  const ownListingError = "Вы не можете купить собственное объявление";
  const currentUserId = String(user?.id || user?._id || "");
  const ownerUserId = String(product?.userId || "");
  const isOwnListing = Boolean(currentUserId && ownerUserId && currentUserId === ownerUserId);

  const resetViewerTransform = useCallback(() => {
    setZoom((prev) => (prev === 1 ? prev : 1));
    setPan((prev) => (prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 }));
    setIsPanning(false);
  }, []);

  const clampPan = useCallback((nextPan, nextZoom) => {
    if (nextZoom <= 1 || !viewerStageRef.current) return { x: 0, y: 0 };
    const stage = viewerStageRef.current;
    const limitX = ((nextZoom - 1) * stage.clientWidth) / 2;
    const limitY = ((nextZoom - 1) * stage.clientHeight) / 2;
    return {
      x: clamp(nextPan.x, -limitX, limitX),
      y: clamp(nextPan.y, -limitY, limitY),
    };
  }, []);

  const applyZoom = useCallback((nextZoom) => {
    const clamped = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX);
    setZoom(clamped);
    setPan((curr) => (clamped <= 1 ? { x: 0, y: 0 } : clampPan(curr, clamped)));
  }, [clampPan]);

  const closeViewer = useCallback(() => {
    setIsViewerOpen(false);
    resetViewerTransform();
  }, [resetViewerTransform]);

  const checkFav = useCallback(() => {
    setIsFav(isFavorite(id));
  }, [id, isFavorite]);

  const toggleFav = () => {
    if (!user) {
      toast(t("product.loginForFavorite"), "error");
      return;
    }
    const added = toggleFavorite(product?.id ?? id);
    setIsFav(added);
    if (added) toast(t("product.addedToFav"), "success");
    else toast(t("product.removedFromFav"), "info");
  };

  const switchImage = useCallback((newIndex) => {
    if (images.length <= 1) return;
    const normalized = (newIndex + images.length) % images.length;
    if (normalized === selectedImage) return;

    const forward = (normalized - selectedImage + images.length) % images.length;
    const backward = (selectedImage - normalized + images.length) % images.length;
    setSlideDir(forward <= backward ? 1 : -1);
    resetViewerTransform();
    setSelectedImage(normalized);
  }, [images.length, selectedImage, resetViewerTransform]);

  const prevImage = useCallback(() => {
    if (images.length <= 1) return;
    switchImage(selectedImage - 1);
  }, [images.length, selectedImage, switchImage]);

  const nextImage = useCallback(() => {
    if (images.length <= 1) return;
    switchImage(selectedImage + 1);
  }, [images.length, selectedImage, switchImage]);

  const handleViewerWheel = useCallback((e) => {
    e.preventDefault();
    applyZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, [applyZoom, zoom]);

  const handleViewerDoubleClick = useCallback((e) => {
    e.preventDefault();
    applyZoom(zoom > 1 ? 1 : 2);
  }, [applyZoom, zoom]);

  const startPanning = useCallback((e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    setDragOrigin({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan.x, pan.y]);

  const onPanMove = useCallback((e) => {
    if (!isPanning || zoom <= 1) return;
    e.preventDefault();
    setPan(clampPan({ x: e.clientX - dragOrigin.x, y: e.clientY - dragOrigin.y }, zoom));
  }, [isPanning, zoom, dragOrigin.x, dragOrigin.y, clampPan]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      touchRef.current = {
        mode: "pinch",
        startDist: getTouchDistance(e.touches) || 1,
        startZoom: zoom,
      };
      return;
    }

    if (e.touches.length !== 1) return;
    const t0 = e.touches[0];
    if (zoom > 1) {
      touchRef.current = {
        mode: "pan",
        startX: t0.clientX,
        startY: t0.clientY,
        basePanX: panRef.current.x,
        basePanY: panRef.current.y,
      };
    } else {
      touchRef.current = {
        mode: "swipe",
        startX: t0.clientX,
        startY: t0.clientY,
      };
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e) => {
    const current = touchRef.current;
    if (!current) return;

    if (current.mode === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      const nextDist = getTouchDistance(e.touches);
      if (!nextDist) return;
      const nextZoom = current.startZoom * (nextDist / current.startDist);
      applyZoom(nextZoom);
      return;
    }

    if (current.mode === "pan" && e.touches.length === 1) {
      e.preventDefault();
      const t0 = e.touches[0];
      const nextPan = {
        x: current.basePanX + (t0.clientX - current.startX),
        y: current.basePanY + (t0.clientY - current.startY),
      };
      setPan(clampPan(nextPan, zoom));
    }
  }, [applyZoom, clampPan, zoom]);

  const handleTouchEnd = useCallback((e) => {
    const current = touchRef.current;
    if (!current) return;

    if (current.mode === "swipe" && e.changedTouches.length && zoom <= 1 && images.length > 1) {
      const t0 = e.changedTouches[0];
      const deltaX = t0.clientX - current.startX;
      const deltaY = t0.clientY - current.startY;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
        if (deltaX < 0) nextImage();
        else prevImage();
      }
    }

    if (e.touches.length === 0) {
      touchRef.current = null;
      return;
    }

    if (e.touches.length === 1) {
      const t0 = e.touches[0];
      if (zoom > 1) {
        touchRef.current = {
          mode: "pan",
          startX: t0.clientX,
          startY: t0.clientY,
          basePanX: panRef.current.x,
          basePanY: panRef.current.y,
        };
      } else {
        touchRef.current = {
          mode: "swipe",
          startX: t0.clientX,
          startY: t0.clientY,
        };
      }
    }
  }, [zoom, images.length, nextImage, prevImage]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, url }); } catch { /* ignore */ }
    } else {
      try { await navigator.clipboard.writeText(url); toast(t("product.linkCopied"), "success"); } catch { /* ignore */ }
    }
  };

  const openViewer = useCallback(() => {
    setIsViewerOpen(true);
  }, []);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    setSelectedImage(0);
    setSlideDir(1);
    setIsViewerOpen(false);
    resetViewerTransform();
  }, [id, resetViewerTransform]);

  useEffect(() => {
    if (!images.length) return;
    setSelectedImage((curr) => clamp(curr, 0, images.length - 1));
  }, [images.length]);

  useEffect(() => {
    if (!isViewerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeViewer();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevImage();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextImage();
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        applyZoom(zoom + ZOOM_STEP);
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        applyZoom(zoom - ZOOM_STEP);
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        applyZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isViewerOpen, closeViewer, prevImage, nextImage, applyZoom, zoom]);

  useEffect(() => {
    if (!isViewerOpen || zoom <= 1) return undefined;
    const onResize = () => {
      setPan((curr) => clampPan(curr, zoom));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isViewerOpen, zoom, clampPan]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const listed = findListedProductById(id);
        if (listed) {
          const listedImages = Array.isArray(listed.images) && listed.images.length
            ? listed.images
            : [listed.image].filter(Boolean);
          if (mounted) { setProduct(listed); setImages(listedImages); }
          return;
        }

        if (!isNumericId(id)) {
          try {
            const listedApi = await getListedProductById(id);
            const listedApiImages = Array.isArray(listedApi?.images) && listedApi.images.length
              ? listedApi.images
              : [listedApi?.image].filter(Boolean);
            if (mounted) {
              setProduct(listedApi);
              setImages(listedApiImages);
            }
            return;
          } catch {
            if (mounted) setProduct(null);
            return;
          }
        }

        const fromMock = mockProducts.find((x) => String(x.id) === String(id));
        if (fromMock) {
          if (mounted) { setProduct(fromMock); setImages([fromMock.image].filter(Boolean)); }
          return;
        }

        const res = await fetch(`https://dummyjson.com/products/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        const allImages = [
          ...(data.images || []),
          data.thumbnail,
        ].filter(Boolean);
        const p = {
          id: data.id,
          name: data.title || data.name,
          price: data.price ?? 0,
          image: allImages[0] || "",
          images: allImages,
          description: data.description || "",
          category: data.category || "",
          brand: data.brand || "",
          rating: data.rating || 0,
          stock: data.stock ?? null,
          tags: data.tags || [],
        };
        if (mounted) { setProduct(p); setImages(allImages); }
      } catch {
        if (mounted) setProduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);
  useEffect(() => {
    let mounted = true;
    const loadReviews = async () => {
      try {
        const items = await getProductReviews(id);
        if (mounted) setReviews(Array.isArray(items) ? items : []);
      } catch {
        if (mounted) setReviews([]);
      }
    };
    loadReviews();
    checkFav();
    const h = () => checkFav();
    window.addEventListener("favorites:changed", h);
    return () => {
      mounted = false;
      window.removeEventListener("favorites:changed", h);
    };
  }, [id, checkFav]);
  const submitReview = async () => {
    if (!reviewText.trim()) { toast(t("product.writeReviewText"), "error"); return; }
    const author = user?.username || t("product.anonymous");
    try {
      const review = await createProductReview(id, {
        author,
        rating: reviewRating,
        text: reviewText.trim(),
      });
      setReviews((prev) => [review, ...prev]);
      setReviewText("");
      setReviewRating(5);
      setShowReviewForm(false);
    } catch {
      toast("Failed to publish review", "error");
      return;
    }
    toast(t("product.reviewPublished"), "success");
  };

  const deleteReview = async (rid) => {
    await deleteProductReview(id, rid);
    setReviews((prev) => prev.filter((r) => String(r.id) !== String(rid)));
    toast(t("product.reviewDeleted"), "info");
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : product?.rating ? Number(product.rating).toFixed(1) : null;

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }); }
    catch { return "-"; }
  };
  if (loading) return (
    <div className={styles.productPage}>
      <div className={styles.skeleton}>
        <div className={styles.skeletonImg}>
          <div className={styles.skeletonPulse} />
        </div>
        <div className={styles.skeletonInfo}>
          <div className={styles.skeletonLine} style={{ width: "40%", height: "14px" }} />
          <div className={styles.skeletonLine} style={{ width: "75%", height: "28px" }} />
          <div className={styles.skeletonLine} style={{ width: "30%", height: "16px" }} />
          <div className={styles.skeletonLine} style={{ width: "45%", height: "32px" }} />
          <div className={styles.skeletonLine} style={{ width: "100%", height: "14px" }} />
          <div className={styles.skeletonLine} style={{ width: "90%", height: "14px" }} />
          <div className={styles.skeletonLine} style={{ width: "60%", height: "48px", marginTop: "auto" }} />
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className={styles.productPage}>
      <div className={styles.notFound}>
        <div className={styles.notFoundIcon}>404</div>
        <h2>{t("product.notFound")}</h2>
        <p>{t("product.notFoundDesc")}</p>
        <Link to="/catalog" className={styles.backBtn}>{t("product.backToCatalog")}</Link>
      </div>
    </div>
  );

  return (
    <div className={styles.productPage}>
      <nav className={styles.breadcrumb}>
        <Link to="/">{t("product.home")}</Link>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        <Link to="/catalog">{t("product.catalog")}</Link>
        {product.category && (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            <span className={styles.breadcrumbCurrent}>{tp.categoryDisplay}</span>
          </>
        )}
      </nav>
      <div className={styles.topSection}>
        <div className={styles.gallery}>
          <div
            className={styles.mainImage}
            ref={imgRef}
            role="button"
            tabIndex={0}
            aria-label="Open product gallery"
            onClick={openViewer}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openViewer();
              }
            }}
          >
            <img
              key={`${product.id}-${selectedImage}`}
              src={images[selectedImage] || product.image}
              alt={tp.name}
              className={`${styles.mainImagePreview} ${styles.imageFadeIn}`}
              style={{ "--image-enter-x": `${-10 * slideDir}px` }}
              draggable={false}
              onError={(e) => {
                const el = e.currentTarget;
                if (el.dataset.fallbackApplied) return;
                el.dataset.fallbackApplied = "1";
                el.src = getFallbackImage(product.id);
              }}
            />
            <button
              className={styles.viewerLaunchBtn}
              onClick={(e) => {
                e.stopPropagation();
                openViewer();
              }}
              aria-label="Zoom image"
              title="Zoom image"
            >
              <ZoomIcon />
            </button>
            <button
              className={`${styles.favBtn} ${isFav ? styles.favActive : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleFav();
              }}
              aria-label="Toggle favorite"
              title="Toggle favorite"
            >
              <HeartIcon filled={isFav} />
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className={`${styles.galleryArrow} ${styles.galleryArrowLeft}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  aria-label="Previous image"
                >
                  &lsaquo;
                </button>
                <button
                  type="button"
                  className={`${styles.galleryArrow} ${styles.galleryArrowRight}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  aria-label="Next image"
                >
                  &rsaquo;
                </button>
                <div className={styles.imageCounter}>{selectedImage + 1} / {images.length}</div>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className={styles.thumbs}>
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.thumbBtn} ${i === selectedImage ? styles.thumbBtnActive : ""}`}
                  onClick={() => switchImage(i)}
                  aria-label={`Image ${i + 1}`}
                >
                  <img
                    src={img}
                    alt=""
                    className={`${styles.thumb} ${i === selectedImage ? styles.thumbActive : ""}`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.info}>
          <div className={styles.infoTopRow}>
            {product.brand && <span className={styles.brand}>{product.brand}</span>}
            {/^[a-f0-9]{24}$/i.test(String(product?.id ?? "")) && !product.sold ? (
              <span className={styles.usedBadge}>USED</span>
            ) : !product.sold && isNumericId(product.id) ? (
              <span className={styles.newBadge}>NEW</span>
            ) : null}
          </div>
          <h1 className={styles.title}>{tp.name}</h1>

          <div className={styles.ratingRow}>
            {avgRating && (
              <>
                <StarRating rating={Math.round(Number(avgRating))} size={18} />
                <span className={styles.ratingValue}>{avgRating}</span>
              </>
            )}
            <span className={styles.reviewCount}>
              {reviews.length} {reviews.length === 1 ? t("product.review") : reviews.length < 5 ? t("product.reviews24") : t("product.reviews5")}
            </span>
          </div>

          <div className={styles.divider} />

          <div className={styles.priceBlock}>
            <span className={styles.price}>{formatPrice(product.price)}</span>
            {product.stock != null && (
              <span className={`${styles.stock} ${product.stock > 0 ? styles.inStock : styles.outOfStock}`}>
                <span className={styles.stockDot} />
                {product.stock > 0 ? `${t("product.inStock")} (${product.stock})` : t("product.outOfStock")}
              </span>
            )}
          </div>

          {tp.description && <p className={styles.desc}>{tp.description}</p>}

          {product.tags && product.tags.length > 0 && (
            <div className={styles.tags}>
              {product.tags.map((tag, i) => (
                <span key={i} className={styles.tag}>#{tag}</span>
              ))}
            </div>
          )}

          <div className={styles.divider} />
          <div className={styles.purchaseArea}>
            {product.sold ? (
              <div className={styles.soldBanner}>{t("product.soldOut")}</div>
            ) : isOwnListing ? (
              <div className={styles.soldBanner}>{ownListingError}</div>
            ) : (
              <>
            <div className={styles.quantityRow}>
              <span className={styles.quantityLabel}>{t("product.quantity")}:</span>
              <div className={styles.quantitySelector}>
                <button
                  className={styles.quantityBtn}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || !isNumericId(product.id)}
                >-</button>
                <span className={styles.quantityValue}>{!isNumericId(product.id) ? 1 : quantity}</span>
                <button
                  className={styles.quantityBtn}
                  onClick={() => setQuantity((q) => product.stock != null ? Math.min(product.stock, q + 1) : q + 1)}
                  disabled={(product.stock != null && quantity >= product.stock) || !isNumericId(product.id)}
                >+</button>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.addBtn}
                onClick={async () => {
                  if (!user) {
                    toast(t("product.loginForCart"), "error");
                    return;
                  }
                  if (isOwnListing) {
                    toast(ownListingError, "error");
                    return;
                  }
                  const qty = !isNumericId(product.id) ? 1 : quantity;
                  const result = addToCart(product, qty);
                  if (result === "OWN_PRODUCT") {
                    toast(ownListingError, "error");
                    return;
                  }
                  if (result === "ALREADY_IN_CART") {
                    toast(t("product.alreadyInCart"), "info");
                    return;
                  }
                  toast(`${tp.name} ${t("product.addedToCart")}`, "success");
                  setQuantity(1);
                }}
              >
                {t("product.addToCart")}
              </button>
              <button className={`${styles.favBtnLarge} ${isFav ? styles.favActive : ""}`} onClick={toggleFav}>
                <HeartIcon filled={isFav} />
              </button>
              <button className={styles.shareBtn} onClick={handleShare} title={t("product.share")}>
                {t("product.share")}
              </button>
            </div>
              </>
            )}
          </div>
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <span>{t("product.fastDelivery")}</span>
            </div>
            <div className={styles.trustBadge}>
              <span>{t("product.safePayment")}</span>
            </div>
            <div className={styles.trustBadge}>
              <span>{t("product.returnPolicy")}</span>
            </div>
          </div>
        </div>
      </div>
      {isViewerOpen && (
        <div
          className={styles.viewerOverlay}
          onClick={closeViewer}
          role="dialog"
          aria-modal="true"
          aria-label="Product image viewer"
        >
          <div className={styles.viewerContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.viewerToolbar}>
              <div className={styles.viewerZoomControls}>
                <button
                  type="button"
                  className={styles.viewerToolbarBtn}
                  onClick={() => applyZoom(zoom - ZOOM_STEP)}
                  disabled={zoom <= ZOOM_MIN}
                  aria-label="Zoom out"
                >
                  -
                </button>
                <span className={styles.viewerZoomLabel}>{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  className={styles.viewerToolbarBtn}
                  onClick={() => applyZoom(zoom + ZOOM_STEP)}
                  disabled={zoom >= ZOOM_MAX}
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  className={styles.viewerToolbarBtn}
                  onClick={() => applyZoom(1)}
                  disabled={zoom <= 1}
                  aria-label="Reset zoom"
                >
                  100%
                </button>
              </div>
              <button
                type="button"
                className={styles.viewerCloseBtn}
                onClick={closeViewer}
                aria-label="Close viewer"
              >
                Close
              </button>
            </div>

            <div
              className={`${styles.viewerStage} ${zoom > 1 ? styles.viewerStageZoomed : ""}`}
              ref={viewerStageRef}
              onDoubleClick={handleViewerDoubleClick}
              onWheel={handleViewerWheel}
              onMouseDown={startPanning}
              onMouseMove={onPanMove}
              onMouseUp={stopPanning}
              onMouseLeave={stopPanning}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <img
                src={images[selectedImage] || product.image}
                alt={tp.name}
                className={styles.viewerImage}
                style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
                draggable={false}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.dataset.fallbackApplied) return;
                  el.dataset.fallbackApplied = "1";
                  el.src = getFallbackImage(product.id);
                }}
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.viewerArrow} ${styles.viewerArrowLeft}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={prevImage}
                    aria-label="Previous image"
                  >
                    &lsaquo;
                  </button>
                  <button
                    type="button"
                    className={`${styles.viewerArrow} ${styles.viewerArrowRight}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={nextImage}
                    aria-label="Next image"
                  >
                    &rsaquo;
                  </button>
                  <div className={styles.viewerCounter}>{selectedImage + 1} / {images.length}</div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className={styles.viewerThumbs}>
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.viewerThumbBtn} ${i === selectedImage ? styles.viewerThumbBtnActive : ""}`}
                    onClick={() => switchImage(i)}
                    aria-label={`Image ${i + 1}`}
                  >
                    <img src={img} alt="" className={styles.viewerThumbImg} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className={styles.tabsSection}>
        <div className={styles.tabsHeader}>
          <button
            className={`${styles.tab} ${activeTab === "description" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("description")}
          >
            {t("product.description")}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "reviews" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            {t("product.reviewsTab")}{reviews.length > 0 && <span className={styles.tabBadge}>{reviews.length}</span>}
          </button>
        </div>
        {activeTab === "description" && (
          <div className={styles.tabContent}>
            {product.description ? (
              <div className={styles.descriptionFull}>
                <p>{tp.description}</p>
                {product.brand && (
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>{t("product.brand")}</span>
                    <span className={styles.specValue}>{product.brand}</span>
                  </div>
                )}
                {product.category && (
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>{t("product.category")}</span>
                    <span className={styles.specValue}>{tp.categoryDisplay}</span>
                  </div>
                )}
                {product.stock != null && (
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>{t("product.stock")}</span>
                    <span className={styles.specValue}>{product.stock} {t("cart.pcs")}</span>
                  </div>
                )}
                {product.tags && product.tags.length > 0 && (
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>{t("product.tags")}</span>
                    <span className={styles.specValue}>{product.tags.join(", ")}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.noContent}>{t("product.noDescription")}</p>
            )}
          </div>
        )}
        {activeTab === "reviews" && (
          <div className={styles.tabContent}>
            <div className={styles.reviewsHeader}>
              <h3>{t("product.reviewsTitle")}</h3>
              <button
                className={styles.writeReviewBtn}
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                {showReviewForm ? t("product.cancel") : t("product.writeReview")}
              </button>
            </div>
            {reviews.length > 0 && (
              <div className={styles.reviewsSummary}>
                <div className={styles.summaryBig}>
                  <span className={styles.summaryScore}>{avgRating}</span>
                  <StarRating rating={Math.round(Number(avgRating))} size={22} />
                  <span className={styles.summaryCount}>{t("product.basedOn")} {reviews.length} {reviews.length === 1 ? t("product.reviewSingle") : t("product.reviewPlural")}</span>
                </div>
                <div className={styles.summaryBars}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter((r) => r.rating === star).length;
                    const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                    return (
                      <div key={star} className={styles.barRow}>
                        <span className={styles.barLabel}>{star}/5</span>
                        <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
                        <span className={styles.barCount}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {showReviewForm && (
              <div className={styles.reviewForm}>
                <div className={styles.formRow}>
                  <label>{t("product.rating")}</label>
                  <StarRating rating={reviewRating} onRate={setReviewRating} interactive size={28} />
                </div>
                <div className={styles.formRow}>
                  <label>{t("product.reviewLabel")}</label>
                  <textarea
                    placeholder={t("product.reviewPlaceholder")}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className={styles.reviewTextarea}
                    rows={4}
                  />
                </div>
                <button className={styles.submitReviewBtn} onClick={submitReview}>
                  {t("product.publishReview")}
                </button>
              </div>
            )}
            {reviews.length === 0 ? (
              <div className={styles.noReviews}>
                <p>{t("product.noReviews")}</p>
              </div>
            ) : (
              <div className={styles.reviewsList}>
                {reviews.map((r, idx) => (
                  <div key={r.id} className={styles.reviewCard} style={{ animationDelay: `${idx * 0.06}s` }}>
                    <div className={styles.reviewTop}>
                      <span className={styles.reviewAvatar}>{r.avatar || getInitials(r.author)}</span>
                      <div className={styles.reviewMeta}>
                        <span className={styles.reviewAuthor}>{r.author}</span>
                        <span className={styles.reviewDate}>{fmtDate(r.date)}</span>
                      </div>
                      <StarRating rating={r.rating} size={14} />
                      <button className={styles.reviewDelete} onClick={() => deleteReview(r.id)} title={t("product.deleteReview")}>x</button>
                    </div>
                    <p className={styles.reviewText}>{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Product;

