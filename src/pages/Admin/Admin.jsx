import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Admin.module.css";
import formatPrice from "../../utils/formatPrice";
import AvatarPicker from "../../components/AvatarPicker/AvatarPicker";
import { useToast } from "../../components/Toast/Toast";
import { useAuth } from "../../store";
import { useTranslation } from "../../i18n";
const ls = (key, fallback = "[]") => {
  try { return JSON.parse(localStorage.getItem(key) || fallback); }
  catch { return JSON.parse(fallback); }
};
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const fmtDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
};

const ADMIN_CREDENTIALS = { username: "admin", password: "admin123" };
const Admin = () => {
  const { user: currentUser, avatarSrc, setAvatar } = useAuth();
  const isAdmin = currentUser?.isAdmin === true;
  const toast = useToast();
  const { t } = useTranslation();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const adminInitials = (currentUser?.username || "AD").slice(0, 2).toUpperCase();
  const handleAvatarSelect = async (src) => {
    try {
      await setAvatar(src);
      toast(t("admin.avatarUpdated"), "success");
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
  const [users, setUsers] = useState(() => ls("users"));
  const [products, setProducts] = useState(() => ls("listedProducts"));
  const [orders, setOrders] = useState(() => ls("orders"));
  const [tab, setTab] = useState("stats");
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const reload = useCallback(() => {
    setUsers(ls("users"));
    setProducts(ls("listedProducts"));
    setOrders(ls("orders"));
  }, []);

  useEffect(() => {
    window.addEventListener("storage", reload);
    window.addEventListener("myproducts:changed", reload);
    window.addEventListener("orders:changed", reload);
    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener("myproducts:changed", reload);
      window.removeEventListener("orders:changed", reload);
    };
  }, [reload]);
  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.noAccess}>
          <h2>{t("admin.accessDenied")}</h2>
          <p>{t("admin.adminOnly")}</p>
          <p style={{ marginTop: "1rem", color: "#888", fontSize: "0.85rem" }}>
            {t("admin.adminHint", { username: ADMIN_CREDENTIALS.username, password: ADMIN_CREDENTIALS.password })}
          </p>
          <p style={{ marginTop: "1rem" }}><Link to="/">{t("admin.returnHome")}</Link></p>
        </div>
      </div>
    );
  }
  const favCount = ls("favorites").length;
  const cartCount = ls("cart").reduce((s, i) => s + (i.quantity || 1), 0);
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalItemsSold = orders.reduce((s, o) => s + (o.totalItems || 0), 0);
  const deleteUser = (id) => {
    if (!confirm(t("admin.confirmDeleteUser"))) return;
    const updated = users.filter((u) => u.id !== id);
    save("users", updated);
    setUsers(updated);
  };

  const toggleAdmin = (id) => {
    const updated = users.map((u) => u.id === id ? { ...u, isAdmin: !u.isAdmin } : u);
    save("users", updated);
    setUsers(updated);
  };
  const deleteProduct = (id) => {
    if (!confirm(t("admin.confirmDeleteProduct"))) return;
    const updated = products.filter((p) => p.id !== id);
    save("listedProducts", updated);
    setProducts(updated);
    window.dispatchEvent(new Event("myproducts:changed"));
  };
  const deleteOrder = (id) => {
    if (!confirm(t("admin.confirmDeleteOrder"))) return;
    const updated = orders.filter((o) => o.id !== id);
    save("orders", updated);
    setOrders(updated);
  };

  const clearOrders = () => {
    if (!confirm(t("admin.confirmClearHistory"))) return;
    save("orders", []);
    setOrders([]);
  };
  const q = search.toLowerCase();
  const filteredUsers = q
    ? users.filter((u) => (u.username || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q))
    : users;

  const filteredProducts = q
    ? products.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q))
    : products;

  const filteredOrders = q
    ? orders.filter((o) =>
        (o.username || "").toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        (o.items || []).some((i) => (i.name || "").toLowerCase().includes(q))
      )
    : orders;

  const TABS = [
    { key: "stats", label: t("admin.tabOverview") },
    { key: "accounts", label: t("admin.tabAccounts") },
    { key: "orders", label: t("admin.tabOrders") },
    { key: "products", label: t("admin.tabProducts") },
  ];

  return (
    <div className={styles.container}>
      {showAvatarPicker && (
        <AvatarPicker
          currentAvatar={avatarSrc}
          initials={adminInitials}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.adminAvatarBtn} onClick={() => setShowAvatarPicker(true)} title={t("profile.changeAvatar")}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className={styles.adminAvatarImg} />
            ) : (
              <span className={styles.adminAvatarFallback}>{adminInitials}</span>
            )}
          </button>
          <h1>{t("admin.title")}</h1>
        </div>
        <Link to="/" className={styles.backLink}>{t("admin.backToHome")}</Link>
      </div>
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{users.length}</div>
          <div className={styles.statLabel}>{t("admin.accounts")}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{orders.length}</div>
          <div className={styles.statLabel}>{t("admin.ordersCount")}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalItemsSold}</div>
          <div className={styles.statLabel}>{t("admin.itemsSold")}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatPrice(totalRevenue)}</div>
          <div className={styles.statLabel}>{t("admin.totalRevenue")}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{products.length}</div>
          <div className={styles.statLabel}>{t("admin.listedProducts")}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{favCount}</div>
          <div className={styles.statLabel}>{t("admin.favoritesCount")}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{cartCount}</div>
          <div className={styles.statLabel}>{t("admin.inCartNow")}</div>
        </div>
      </div>
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => { setTab(t.key); setSearch(""); setExpandedOrder(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "stats" && (
        <div>
          <h3 className={styles.sectionTitle}>{t("admin.recentOrders")}</h3>
          {orders.length === 0 ? (
            <p className={styles.emptyText}>{t("admin.noOrders")}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>{t("admin.orderNum")}</th><th>{t("admin.date")}</th><th>{t("admin.buyer")}</th><th>{t("admin.qty")}</th><th>{t("admin.total")}</th></tr></thead>
                <tbody>
                  {orders.slice().reverse().slice(0, 5).map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td>{fmtDate(o.date)}</td>
                      <td>{o.username || t("admin.guest")}</td>
                      <td>{o.totalItems || 0}</td>
                      <td>{formatPrice(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className={styles.sectionTitleSpaced}>{t("admin.recentUsers")}</h3>
          {users.length === 0 ? (
            <p className={styles.emptyText}>{t("admin.noUsers")}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>{t("admin.id")}</th><th>{t("admin.usernameCol")}</th><th>{t("admin.emailCol")}</th><th>{t("admin.roleCol")}</th></tr></thead>
                <tbody>
                  {users.slice(-5).reverse().map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.username || "—"}</td>
                      <td>{u.email || "—"}</td>
                      <td><span className={`${styles.badge} ${u.isAdmin ? styles.badgeAdmin : styles.badgeUser}`}>{u.isAdmin ? "admin" : "user"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {tab === "accounts" && (
        <div>
          <div className={styles.searchRow}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t("admin.searchByNameEmail")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filteredUsers.length === 0 ? (
            <p className={styles.emptyText}>{t("admin.noUsersFound")}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("admin.id")}</th>
                    <th>{t("admin.usernameCol")}</th>
                    <th>{t("admin.emailCol")}</th>
                    <th>{t("admin.roleCol")}</th>
                    <th>{t("admin.ordersCol")}</th>
                    <th>{t("admin.spentCol")}</th>
                    <th>{t("admin.actionsCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const userOrders = orders.filter((o) => o.userId === u.id);
                    const userSpent = userOrders.reduce((s, o) => s + (o.total || 0), 0);
                    return (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.username || "—"}</td>
                        <td>{u.email || "—"}</td>
                        <td><span className={`${styles.badge} ${u.isAdmin ? styles.badgeAdmin : styles.badgeUser}`}>{u.isAdmin ? "admin" : "user"}</span></td>
                        <td>{userOrders.length}</td>
                        <td>{formatPrice(userSpent)}</td>
                        <td>
                          <div className={styles.actionRow}>
                            <button className={styles.successBtn} onClick={() => toggleAdmin(u.id)}>{u.isAdmin ? t("admin.revokeAdmin") : t("admin.grantAdmin")}</button>
                            <button className={styles.dangerBtn} onClick={() => deleteUser(u.id)}>{t("admin.deleteUser")}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {tab === "orders" && (
        <div>
          <div className={styles.searchRow} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t("admin.searchOrders")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {orders.length > 0 && (
              <button className={styles.dangerBtn} onClick={clearOrders}>{t("admin.clearHistory")}</button>
            )}
          </div>

          {filteredOrders.length === 0 ? (
            <p className={styles.emptyText}>{t("admin.noOrdersFound")}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("admin.orderNumber")}</th>
                    <th>{t("admin.date")}</th>
                    <th>{t("admin.buyer")}</th>
                    <th>{t("admin.itemsCount")}</th>
                    <th>{t("admin.total")}</th>
                    <th>{t("admin.actionsCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice().reverse().map((o) => (
                    <React.Fragment key={o.id}>
                      <tr
                        className={expandedOrder === o.id ? styles.expandedRow : ""}
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                      >
                        <td>{o.id}</td>
                        <td>{fmtDate(o.date)}</td>
                        <td>{o.username || t("admin.guest")}</td>
                        <td>{o.totalItems || 0}</td>
                        <td>{formatPrice(o.total)}</td>
                        <td>
                          <div className={styles.actionRow}>
                            <button
                              className={styles.successBtn}
                              onClick={(e) => { e.stopPropagation(); setExpandedOrder(expandedOrder === o.id ? null : o.id); }}
                            >
                              {expandedOrder === o.id ? t("admin.collapse") : t("admin.details")}
                            </button>
                            <button className={styles.dangerBtn} onClick={(e) => { e.stopPropagation(); deleteOrder(o.id); }}>{t("admin.deleteOrder")}</button>
                          </div>
                        </td>
                      </tr>
                      {expandedOrder === o.id && (
                        <tr>
                          <td colSpan={6} className={styles.orderDetail}>
                            <div className={styles.orderItems}>
                              {(o.items || []).map((item, idx) => (
                                <div key={idx} className={styles.orderItem}>
                                  {item.image && <img src={item.image} alt="" className={styles.productImg} />}
                                  <div className={styles.orderItemInfo}>
                                    <strong>{item.name || "—"}</strong>
                                    <span>{item.quantity} × {formatPrice(item.price)}</span>
                                  </div>
                                  <div className={styles.orderItemTotal}>
                                    {formatPrice(item.price * item.quantity)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {tab === "products" && (
        <div>
          <div className={styles.searchRow}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t("admin.searchProducts")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filteredProducts.length === 0 ? (
            <p className={styles.emptyText}>{t("admin.noProductsFound")}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th></th><th>{t("admin.id")}</th><th>{t("admin.productName")}</th><th>{t("admin.productCategory")}</th><th>{t("admin.productPrice")}</th><th>{t("admin.actionsCol")}</th></tr></thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.image ? <img src={p.image} alt="" className={styles.productImg} /> : "—"}</td>
                      <td>{p.id}</td>
                      <td>{p.name || "—"}</td>
                      <td>{p.category || "—"}</td>
                      <td>{formatPrice(p.price)}</td>
                      <td>
                        <div className={styles.actionRow}>
                          <button className={styles.dangerBtn} onClick={() => deleteProduct(p.id)}>{t("admin.deleteProduct")}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;
