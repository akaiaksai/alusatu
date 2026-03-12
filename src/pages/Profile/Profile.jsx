import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Profile.module.css";
import ProductCard from "../../components/ProductCard/ProductCard";
import { useToast } from "../../components/Toast/Toast";
import AvatarPicker from "../../components/AvatarPicker/AvatarPicker";
import { mockProducts } from "../../data/mockProducts";
import { getProducts } from "../../api/products.api";
import formatPrice, { formatKzt, toPriceKzt } from "../../utils/formatPrice";
import { updateProfile as apiUpdateProfile, getMyOrders, getMyListedProducts, deleteListedProduct, getProfile, getOrderReceipt } from "../../api/users.api";
import { logout as apiLogout } from "../../api/auth.api";
import { useAuth, useFavorites } from "../../store";
import { topUpBalance, refundOrder } from "../../api/users.api";
import { useTranslation } from "../../i18n";

const fmtDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
};

const ORDER_STATUSES = ["paid", "shipped", "delivered"];
const DAY_MS = 24 * 60 * 60 * 1000;
const REFUND_AFTER_DELIVERED_MS = 14 * DAY_MS;

const parseDateSafe = (value) => {
  if (!value) return null;
  const dt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const parsePickupDate = (value) => {
  const raw = String(value || "").trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const getOrderDeliveryDate = (order) => {
  const fromDeliveryDate = parseDateSafe(order?.deliveryDate);
  if (fromDeliveryDate) return fromDeliveryDate;

  const fromPickupDate = parsePickupDate(order?.pickupDate);
  if (fromPickupDate) return fromPickupDate;

  const fromCreated = parseDateSafe(order?.date);
  if (!fromCreated) return null;
  return new Date(fromCreated.getTime() + 2 * DAY_MS);
};

const getOrderShippedDate = (order) => {
  const explicitShippedAt = parseDateSafe(order?.shippedAt);
  if (explicitShippedAt) return explicitShippedAt;

  const createdAt = parseDateSafe(order?.paidAt) || parseDateSafe(order?.date);
  const deliveryDate = getOrderDeliveryDate(order);
  if (!createdAt || !deliveryDate) return null;

  const diffMs = deliveryDate.getTime() - createdAt.getTime();
  if (diffMs <= 0) return new Date(createdAt.getTime() + 6 * 60 * 60 * 1000);
  return new Date(createdAt.getTime() + Math.floor(diffMs / 2));
};

const getTimedStatus = (order, nowMs) => {
  if (!order) return "paid";
  if (order.status === "cancelled") return "cancelled";

  const now = Number(nowMs || Date.now());
  const deliveryDate = getOrderDeliveryDate(order);
  const shippedAt = getOrderShippedDate(order);

  let derived = "paid";

  if (deliveryDate && now >= deliveryDate.getTime()) {
    derived = "delivered";
  } else if (shippedAt && now >= shippedAt.getTime()) {
    derived = "shipped";
  }

  return derived;
};

const canRefundOrder = (order, status, nowMs) => {
  if (!order || status === "cancelled") return false;
  if (status === "paid" || status === "shipped") return true;
  if (status !== "delivered") return false;

  const now = Number(nowMs || Date.now());
  const deliveredAt = parseDateSafe(order?.deliveredAt) || getOrderDeliveryDate(order);
  if (!deliveredAt) return false;
  return now <= (deliveredAt.getTime() + REFUND_AFTER_DELIVERED_MS);
};

const formatCountdown = (ms) => {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, "0")).join(":");
};

const normalizeOrderReceipt = (order) => {
  const receiptData = order?.receipt || null;
  const sourceItems = Array.isArray(receiptData?.items) ? receiptData.items : (order?.items || []);
  const items = sourceItems.map((item) => ({
    productId: item.productId || item.id || null,
    name: item.name || "",
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    image: item.image || "",
  }));

  return {
    id: receiptData?.receiptNumber || order?.id || order?._id || "",
    date: receiptData?.issuedAt || order?.date || new Date().toISOString(),
    username: receiptData?.buyer || order?.username || "",
    paymentMethod: receiptData?.paymentMethod || "online",
    items,
    total: Number(receiptData?.total ?? order?.total ?? 0),
    totalItems: Number(receiptData?.totalItems ?? order?.totalItems ?? items.reduce((sum, item) => sum + item.quantity, 0)),
    pickupDate: receiptData?.pickupDate || order?.pickupDate || "",
    deliveryMethod: receiptData?.deliveryMethod || order?.deliveryMethod || "pickup",
    deliveryAddress: receiptData?.deliveryAddress || order?.deliveryAddress || "",
    pickupAddress: receiptData?.pickupAddress || order?.pickupAddress || "",
  };
};

const Profile = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, token, avatarSrc, logout: authLogout, updateProfile: storeUpdateProfile, setAvatar } = useAuth();
  const { favorites: favoriteIds } = useFavorites();
  const { t, lang } = useTranslation();
  const [tab, setTab] = useState("info");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", email: "", phone: "", city: "" });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const handleAvatarSelect = async (src) => {
    try {
      await setAvatar(src);
      toast(t("profile.avatarUpdated"), "success");
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error;
      if (status === 413) {
        toast("Аватар слишком большой. Выберите фото поменьше.", "error");
        return;
      }
      if (err?.code === "AUTH_REQUIRED") {
        toast("Сессия истекла. Войдите в аккаунт снова.", "error");
        return;
      }
      toast(serverMsg || "Не удалось сохранить аватар. Попробуйте ещё раз.", "error");
    }
  };
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [topUpAmount, setTopUpAmount] = useState(0);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [expandedReceiptOrderId, setExpandedReceiptOrderId] = useState("");
  const [receiptLoadingOrderId, setReceiptLoadingOrderId] = useState("");
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    if (user && typeof user.balance === 'number') setBalance(user.balance);
  }, [user]);

  useEffect(() => {
    if (token) {
      getProfile().then(serverUser => {
        if (serverUser && typeof serverUser.balance === 'number') {
          setBalance(serverUser.balance);
          storeUpdateProfile({ balance: serverUser.balance });
        }
      }).catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const reload = useCallback(async () => {
    if (!token) {
      setOrders([]);
      setMyProducts([]);
      return;
    }

    try {
      const apiOrders = await getMyOrders();
      setOrders(apiOrders.map((o) => ({
        id: o._id || o.id,
        date: o.createdAt || o.date,
        userId: o.userId,
        username: o.username,
        items: (o.items || []).map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
        total: o.total,
        totalItems: o.totalItems,
        status: o.status,
        paidAt: o.paidAt || o.createdAt || "",
        shippedAt: o.shippedAt || "",
        deliveryDate: o.deliveryDate || "",
        deliveredAt: o.deliveredAt || "",
        pickupDate: o.pickupDate || "",
        deliveryMethod: o.deliveryMethod || "pickup",
        deliveryAddress: o.deliveryAddress || "",
        pickupAddress: o.pickupAddress || "",
        receipt: o.receipt || null,
        _fromApi: true,
      })));
    } catch {
      setOrders([]);
    }

    try {
      const apiProducts = await getMyListedProducts();
      setMyProducts(Array.isArray(apiProducts) ? apiProducts : []);
    } catch {
      setMyProducts([]);
    }
  }, [token]);

  useEffect(() => {
    reload()
    window.addEventListener("orders:changed", reload);
    window.addEventListener("myproducts:changed", reload);
    return () => {
      window.removeEventListener("orders:changed", reload);
      window.removeEventListener("myproducts:changed", reload);
    };
  }, [reload, token]);

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    try {
      const ids = Array.isArray(favoriteIds) ? favoriteIds.map((id) => String(id)) : [];
      if (!ids.length) {
        setFavoriteProducts([]);
        return;
      }

      let remote = [];
      try { remote = await getProducts({ limit: 200 }); } catch { remote = []; }

      const map = new Map();
      (myProducts || []).forEach((p) => map.set(String(p.id), p));
      (mockProducts || []).forEach((p) => map.set(String(p.id), p));
      (remote || []).forEach((p) => map.set(String(p.id), p));

      setFavoriteProducts(ids.map((id) => map.get(String(id))).filter(Boolean));
    } catch { setFavoriteProducts([]); }
    finally { setFavoritesLoading(false); }
  }, [favoriteIds, myProducts]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);
  const startEdit = () => {
    setEditForm({
      username: user?.username || "",
      email: user?.email || "",
      phone: user?.phone || "",
      city: user?.city || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    const updated = {
      ...user,
      username: editForm.username.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      city: (editForm.city || "").trim(),
    };

    try {
      if (token) {
        const apiUser = await apiUpdateProfile({
          username: updated.username,
          email: updated.email,
          phone: updated.phone,
          city: updated.city,
        });
        updated.username = apiUser.username;
        updated.email = apiUser.email;
        updated.phone = apiUser.phone;
        updated.city = apiUser.city || "";
      }
    } catch {
      toast("Не удалось обновить профиль", "error");
      return;
    }

    storeUpdateProfile(updated);

    setEditing(false);
    toast(t("profile.profileUpdated"), "success");
  };
  const handleLogout = () => {
    apiLogout();
    authLogout();
    toast(t("profile.loggedOut"), "info");
    navigate("/");
  };
  const deleteListing = async (id) => {

    try {
      if (token) await deleteListedProduct(id);
    } catch { /* ignore */ }

    const updated = myProducts.filter((p) => p.id !== id);
    setMyProducts(updated);
    window.dispatchEvent(new Event("myproducts:changed"));
    toast(t("profile.listingDeleted"), "success");
  };
  const userOrders = user ? orders : [];
  const kzt = (o, v) => o?._fromApi ? v : toPriceKzt(v);
  const totalSpent = userOrders.reduce((s, o) => s + kzt(o, o.total || 0), 0);
  const totalBought = userOrders.reduce((s, o) => s + (o.totalItems || 0), 0);
  const initials = (user?.username || "?").slice(0, 2).toUpperCase();

  const TABS = [
    { key: "info", label: t("profile.tabProfile") },
    { key: "orders", label: `${t("profile.tabOrders")} (${userOrders.length})` },
    { key: "listings", label: `${t("profile.tabListings")} (${myProducts.length})` },
    { key: "favorites", label: `${t("profile.tabFavorites")} (${favoriteProducts.length})` },
  ];
  if (!user) {
    return (
      <div className={styles.container}>
        <h1>{t("profile.title")}</h1>
        <div className={styles.card}>
          <p className={styles.muted}>{t("profile.notLoggedIn")}</p>
          <p className={styles.muted}>{t("profile.loginHint")}</p>
        </div>
      </div>
    );
  }

  const handleTopUp = async () => {
    if (!topUpAmount || topUpAmount <= 0) return toast(t("profile.topUpEnterAmount"), "error");
    setTopUpLoading(true);
    try {
      const { balance: newBalance } = await topUpBalance(topUpAmount);
      setBalance(newBalance);
      storeUpdateProfile({ balance: newBalance });
      toast(t("profile.topUpSuccess"), "success");
      setTopUpAmount(0);
    } catch {
      toast(t("profile.topUpError"), "error");
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleRefund = async (orderId) => {
    try {
      const { balance: newBalance } = await refundOrder(orderId);
      setBalance(newBalance);
      storeUpdateProfile({ balance: newBalance });
      toast(t("profile.refundSuccess"), "success");
      await reload();
    } catch (err) {
      const msg = err?.response?.data?.error || t("profile.refundError");
      toast(msg, "error");
    }
  };

  const statusLabel = (status) => {
    if (status === "cancelled") {
      if (lang === "ru") return "Отменен";
      if (lang === "kk") return "Бас тартылды";
      return "Cancelled";
    }
    if (status === "delivered") {
      if (lang === "ru") return "Получен";
      if (lang === "kk") return "Алынды";
      return "Received";
    }
    return t(`profile.status_${status}`);
  };

  const receiptShowLabel = lang === "ru" ? "Показать чек" : (lang === "kk" ? "Чекті көру" : "View receipt");
  const receiptHideLabel = lang === "ru" ? "Скрыть чек" : (lang === "kk" ? "Чекті жабу" : "Hide receipt");
  const statusEtaPrefix = lang === "ru" ? "До статуса" : (lang === "kk" ? "Келесі мәртебеге дейін" : "Until status");

  const getStatusCountdown = (order, effectiveStatus) => {
    if (effectiveStatus === "cancelled" || effectiveStatus === "delivered") return null;

    const now = Number(nowTs || Date.now());
    const deliveryDate = getOrderDeliveryDate(order);
    if (!deliveryDate) return null;

    if (effectiveStatus === "paid") {
      const shippedAt = getOrderShippedDate(order);
      if (!shippedAt) return null;
      const msLeft = shippedAt.getTime() - now;
      if (msLeft <= 0) return null;
      return {
        nextStatus: "shipped",
        left: formatCountdown(msLeft),
      };
    }

    if (effectiveStatus === "shipped") {
      const msLeft = deliveryDate.getTime() - now;
      if (msLeft <= 0) return null;
      return {
        nextStatus: "delivered",
        left: formatCountdown(msLeft),
      };
    }

    return null;
  };

  const handleToggleReceipt = async (order) => {
    const orderId = String(order.id);

    if (expandedReceiptOrderId === orderId) {
      setExpandedReceiptOrderId("");
      return;
    }

    if (!order.receipt && order._fromApi && token) {
      setReceiptLoadingOrderId(orderId);
      try {
        const receipt = await getOrderReceipt(order.id);
        setOrders((prev) =>
          prev.map((o) => (String(o.id) === orderId ? { ...o, receipt } : o))
        );
      } catch {
      } finally {
        setReceiptLoadingOrderId("");
      }
    }

    setExpandedReceiptOrderId(orderId);
  };

  return (
    <div className={styles.container}>
      {showAvatarPicker && (
        <AvatarPicker
          currentAvatar={avatarSrc}
          initials={initials}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
      <div className={styles.profileHeader}>
        <button className={styles.avatarBtn} onClick={() => setShowAvatarPicker(true)} title={t("profile.changeAvatar")}>
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatar}>{initials}</div>
          )}
          <span className={styles.avatarEdit}>{t("profile.changeLabel")}</span>
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.username}>{user.username || t("profile.user")}</h1>
          <p className={styles.email}>{user.email || ""}</p>
          {user.isAdmin && <span className={styles.adminBadge}>admin</span>}
        </div>
        <div className={styles.balanceBox}>
          <div className={styles.balanceLabel}>{t("profile.balance")}</div>
          <div className={styles.balanceValue}>{formatKzt(balance)}</div>
          <div className={styles.topUpRow}>
            <input
              type="number"
              min="1"
              className={styles.topUpInput}
              value={topUpAmount || ""}
              onChange={e => setTopUpAmount(Number(e.target.value))}
              placeholder={t("profile.topUpAmount")}
              disabled={topUpLoading}
            />
            <button className={styles.topUpBtn} onClick={handleTopUp} disabled={topUpLoading || !topUpAmount}>{t("profile.topUp")}</button>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>{t("profile.logoutBtn")}</button>
      </div>
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{userOrders.length}</div>
          <div className={styles.statLabel}>{t("profile.orders")}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{totalBought}</div>
          <div className={styles.statLabel}>{t("profile.boughtItems")}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{formatKzt(totalSpent)}</div>
          <div className={styles.statLabel}>{t("profile.spent")}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{favoriteProducts.length}</div>
          <div className={styles.statLabel}>{t("profile.inFavorites")}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{myProducts.length}</div>
          <div className={styles.statLabel}>{t("profile.listings")}</div>
        </div>
      </div>
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "info" && (
        <div className={styles.card}>
          {!editing ? (
            <>
              <div className={styles.infoGrid}>
                <div>
                  <div className={styles.label}>Username</div>
                  <div className={styles.value}>{user.username || "—"}</div>
                </div>
                <div>
                  <div className={styles.label}>Email</div>
                  <div className={styles.value}>{user.email || "—"}</div>
                </div>
                <div>
                  <div className={styles.label}>{t("profile.phone")}</div>
                  <div className={styles.value}>{user.phone || t("profile.phoneNotSet")}</div>
                </div>
                <div>
                  <div className={styles.label}>City</div>
                  <div className={styles.value}>{user.city || "—"}</div>
                </div>
                <div>
                  <div className={styles.label}>{t("profile.role")}</div>
                  <div className={styles.value}>{user.isAdmin ? t("profile.admin") : t("profile.userRole")}</div>
                </div>
              </div>
              <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={startEdit}>{t("profile.editProfile")}</button>
                <Link to="/sell" className={styles.actionBtnOutline}>{t("profile.postListing")}</Link>
                {user.isAdmin && <Link to="/admin" className={styles.actionBtnOutline}>{t("header.adminPanel")}</Link>}
              </div>
            </>
          ) : (
            <>
              <div className={styles.editForm}>
                <div className={styles.field}>
                  <label className={styles.label}>Username</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Email</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("profile.phone")}</label>
                  <input
                    type="tel"
                    className={styles.input}
                    placeholder={t("profile.phonePlaceholder")}
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>City</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={saveEdit}>{t("profile.save")}</button>
                <button className={styles.actionBtnOutline} onClick={() => setEditing(false)}>{t("profile.cancelEdit")}</button>
              </div>
            </>
          )}
        </div>
      )}
      {tab === "orders" && (
        <div>
          {userOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t("profile.noOrders")}</p>
              <Link to="/catalog" className={styles.actionBtn}>{t("profile.goToCatalog")}</Link>
            </div>
          ) : (
            <div className={styles.ordersList}>
              {userOrders.slice().reverse().map((o) => {
                const effectiveStatus = getTimedStatus(o, nowTs);
                const canRefund = canRefundOrder(o, effectiveStatus, nowTs);
                const statusIdx = effectiveStatus === "cancelled" ? -1 : ORDER_STATUSES.indexOf(effectiveStatus);
                const countdown = getStatusCountdown(o, effectiveStatus);
                const receiptView = normalizeOrderReceipt(o);
                const orderId = String(o.id);
                const isReceiptOpen = expandedReceiptOrderId === orderId;
                const isReceiptLoading = receiptLoadingOrderId === orderId;
                return (
                <div key={o.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <span className={styles.orderId}>{t("profile.orderNumber")} #{String(o.id).slice(-8)}</span>
                    <div className={styles.orderHeaderRight}>
                      <span className={`${styles.orderStatusBadge} ${styles[`orderStatus_${effectiveStatus}`] || ""}`}>
                        {statusLabel(effectiveStatus)}
                      </span>
                      <span className={styles.orderDate}>{fmtDate(o.date)}</span>
                    </div>
                  </div>

                  {effectiveStatus !== "cancelled" && (
                    <div className={styles.trackingBar}>
                      {ORDER_STATUSES.map((s, i) => (
                        <div key={s} className={`${styles.trackingStep} ${i <= statusIdx ? styles.trackingStepDone : ""} ${i === statusIdx ? styles.trackingStepCurrent : ""}`}>
                          <div className={styles.trackingDot} />
                          <span>{statusLabel(s)}</span>
                        </div>
                      ))}
                      <div className={styles.trackingLine}>
                        <div className={styles.trackingLineFill} style={{ width: statusIdx >= 0 ? `${(statusIdx / (ORDER_STATUSES.length - 1)) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  )}

                  {o.deliveryMethod && (
                    <div className={styles.orderDeliveryInfo}>
                      <span className={styles.deliveryBadge}>
                        {o.deliveryMethod === "courier" ? t("profile.deliveryCourier") : t("profile.deliveryPickup")}
                      </span>
                      {o.deliveryMethod === "courier" && o.deliveryAddress && (
                        <span className={styles.deliveryAddr}>{o.deliveryAddress}</span>
                      )}
                      {o.deliveryMethod === "pickup" && o.pickupAddress && (
                        <span className={styles.deliveryAddr}>{o.pickupAddress}</span>
                      )}
                    </div>
                  )}

                  {o.pickupDate && (
                    <div className={styles.orderPickupDate}>
                      {t("profile.pickupDate")}: {new Date(o.pickupDate).toLocaleDateString("ru-RU")}
                    </div>
                  )}
                  {countdown && (
                    <div className={styles.orderEta}>
                      {statusEtaPrefix} "{statusLabel(countdown.nextStatus)}": {countdown.left}
                    </div>
                  )}
                  <div className={styles.orderItems}>
                    {(o.items || []).map((item, idx) => (
                      <div key={idx} className={styles.orderItem}>
                        {item.image && <img src={item.image} alt="" className={styles.orderImg} />}
                        <div className={styles.orderItemInfo}>
                          <span className={styles.orderItemName}>{item.name}</span>
                          <span className={styles.orderItemQty}>{item.quantity} × {formatKzt(kzt(o, item.price))}</span>
                        </div>
                        <div className={styles.orderItemTotal}>{formatKzt(kzt(o, item.price) * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.orderFooter}>
                    <span>{t("profile.orderItems")}: {o.totalItems || 0}</span>
                    <span className={styles.orderTotal}>{t("profile.orderTotal")}: {formatKzt(kzt(o, o.total))}</span>
                    <button className={styles.receiptBtn} onClick={() => handleToggleReceipt(o)} disabled={isReceiptLoading}>
                      {isReceiptLoading ? "..." : isReceiptOpen ? receiptHideLabel : receiptShowLabel}
                    </button>
                    {effectiveStatus !== "cancelled" && canRefund && (
                      <button className={styles.refundBtn} onClick={() => handleRefund(o.id)}>{t("profile.refund")}</button>
                    )}
                    {effectiveStatus === "cancelled" && <span className={styles.orderCancelled}>{t("profile.refunded")}</span>}
                  </div>
                  {isReceiptOpen && (
                    <div className={styles.orderReceipt}>
                      <div className={styles.orderReceiptMeta}>
                        <div><span>{t("cart.receiptNumber")}:</span><strong>{receiptView.id}</strong></div>
                        <div><span>{t("cart.receiptDate")}:</span><strong>{fmtDate(receiptView.date)}</strong></div>
                        <div><span>{t("cart.receiptBuyer")}:</span><strong>{receiptView.username || user.username}</strong></div>
                        <div><span>{t("cart.receiptPayment")}:</span><strong>{t("cart.receiptOnline")}</strong></div>
                      </div>
                      <div className={styles.orderReceiptItems}>
                        {receiptView.items.map((item, idx) => (
                          <div key={`${item.productId || item.name}-${idx}`} className={styles.orderReceiptItem}>
                            <span>{item.name}</span>
                            <span>{item.quantity} x {formatKzt(item.price)}</span>
                          </div>
                        ))}
                      </div>
                      <div className={styles.orderReceiptTotal}>
                        <span>{t("cart.receiptTotal")}</span>
                        <strong>{formatKzt(receiptView.total)}</strong>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {tab === "listings" && (
        <div>
          {myProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t("profile.noListings")}</p>
              <Link to="/sell" className={styles.actionBtn}>{t("profile.postProduct")}</Link>
            </div>
          ) : (
            <div className={styles.listingsGrid}>
              {myProducts.map((p) => (
                <div key={p.id} className={styles.listingCard}>
                  {p.image && <img src={p.image} alt="" className={styles.listingImg} />}
                  <div className={styles.listingInfo}>
                    <strong>{p.name}</strong>
                    <span className={styles.listingPrice}>{formatPrice(p.price)}</span>
                    <span className={styles.listingCat}>{p.category || "—"}</span>
                  </div>
                  <button className={styles.deleteBtn} onClick={() => deleteListing(p.id)}>{t("profile.deleteListing")}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === "favorites" && (
        <div>
          <div className={styles.sectionHeader}>
            <h2>{t("profile.favoritesTitle")}</h2>
            <Link to="/favorites" className={styles.link}>{t("profile.openAll")}</Link>
          </div>

          {favoritesLoading ? (
            <p className={styles.muted}>{t("profile.loading")}</p>
          ) : favoriteProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t("profile.noFavorites")}</p>
              <Link to="/catalog" className={styles.actionBtn}>{t("profile.goToCatalog")}</Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {favoriteProducts
                .filter((p) => p?.image && !/placeholder\.com|via\.placeholder\.com/i.test(p.image) && String(p.image).trim() !== "")
                .slice(0, 8)
                .map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
