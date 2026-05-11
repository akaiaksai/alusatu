import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Admin.module.css";
import formatPrice from "../../utils/formatPrice";
import AvatarPicker from "../../components/AvatarPicker/AvatarPicker";
import { useToast } from "../../components/Toast/Toast";
import { useAuth } from "../../store";
import { useTranslation } from "../../i18n";
import {
  clearAllOrders,
  deleteListedProduct,
  deleteOrder as apiDeleteOrder,
  deleteUser as apiDeleteUser,
  getAllOrders,
  getAllUsers,
  getListedProducts,
  updateUserRole,
} from "../../api/users.api";

const fmtDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const ADMIN_CREDENTIALS = { username: "admin", password: "admin123" };

const normalizeUser = (user) => ({
  ...user,
  id: String(user?._id ?? user?.id ?? "").trim(),
  username: String(user?.username ?? "").trim(),
  email: String(user?.email ?? "").trim(),
  isAdmin: Boolean(user?.isAdmin),
  favorites: Array.isArray(user?.favorites) ? user.favorites : [],
  cart: Array.isArray(user?.cart) ? user.cart : [],
});

const normalizeProduct = (product) => ({
  ...product,
  id: String(product?._id ?? product?.id ?? "").trim(),
  name: String(product?.name || product?.title || "").trim(),
  image: String(product?.image || (Array.isArray(product?.images) ? product.images[0] : "") || "").trim(),
  category: String(product?.category || "").trim(),
  price: Number(product?.price || 0),
});

const normalizeOrder = (order) => {
  const items = Array.isArray(order?.items)
    ? order.items.map((item) => ({
        id: String(item?.productId ?? item?.id ?? "").trim(),
        name: String(item?.name || "").trim(),
        price: Number(item?.price || 0),
        quantity: Number(item?.quantity || 0),
        image: String(item?.image || "").trim(),
      }))
    : [];

  return {
    ...order,
    id: String(order?._id ?? order?.id ?? "").trim(),
    date: order?.createdAt || order?.date || "",
    userId: String(order?.userId?._id ?? order?.userId ?? "").trim(),
    username: String(order?.username || "").trim(),
    items,
    total: Number(order?.total || 0),
    totalItems: Number(order?.totalItems || items.reduce((sum, item) => sum + (item.quantity || 0), 0)),
  };
};

const Admin = () => {
  const { user: currentUser, avatarSrc, setAvatar } = useAuth();
  const isAdmin = currentUser?.isAdmin === true;
  const toast = useToast();
  const { t } = useTranslation();

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const adminInitials = (currentUser?.username || "AD").slice(0, 2).toUpperCase();

  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("stats");
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const [usersData, productsData, ordersData] = await Promise.all([
        getAllUsers(),
        getListedProducts(),
        getAllOrders(),
      ]);

      setUsers((Array.isArray(usersData) ? usersData : []).map(normalizeUser).filter((u) => u.id));
      setProducts((Array.isArray(productsData) ? productsData : []).map(normalizeProduct).filter((p) => p.id));
      setOrders((Array.isArray(ordersData) ? ordersData : []).map(normalizeOrder).filter((o) => o.id));
    } catch (err) {
      const details = err?.response?.data?.error || err?.message || "Failed to load admin data";
      toast(details, "error");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    reload();
    window.addEventListener("myproducts:changed", reload);
    window.addEventListener("orders:changed", reload);
    return () => {
      window.removeEventListener("myproducts:changed", reload);
      window.removeEventListener("orders:changed", reload);
    };
  }, [reload]);

  const handleAvatarSelect = async (src) => {
    try {
      await setAvatar(src);
      toast(t("admin.avatarUpdated"), "success");
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error;
      if (status === 413) {
        toast("Avatar is too large. Please choose a smaller image.", "error");
        return;
      }
      if (err?.code === "AUTH_REQUIRED") {
        toast("Session expired. Please log in again.", "error");
        return;
      }
      toast(serverMsg || "Failed to save avatar. Try again.", "error");
    }
  };

  const favCount = useMemo(
    () => users.reduce((sum, user) => sum + (Array.isArray(user.favorites) ? user.favorites.length : 0), 0),
    [users],
  );

  const cartCount = useMemo(
    () => users.reduce(
      (sum, user) => sum + (Array.isArray(user.cart)
        ? user.cart.reduce((cartSum, item) => cartSum + (Number(item?.quantity) || 1), 0)
        : 0),
      0,
    ),
    [users],
  );

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders],
  );

  const totalItemsSold = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.totalItems || 0), 0),
    [orders],
  );

  const deleteUser = async (id) => {
    if (!confirm(t("admin.confirmDeleteUser"))) return;
    try {
      await apiDeleteUser(id);
      await reload();
    } catch (err) {
      const details = err?.response?.data?.error || err?.message || "Failed to delete user";
      toast(details, "error");
    }
  };

  const toggleAdmin = async (user) => {
    if (!user?.id) return;
    try {
      await updateUserRole(user.id, !user.isAdmin);
      await reload();
    } catch (err) {
      const details = err?.response?.data?.error || err?.message || "Failed to update role";
      toast(details, "error");
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm(t("admin.confirmDeleteProduct"))) return;
    try {
      await deleteListedProduct(id);
      await reload();
      window.dispatchEvent(new Event("myproducts:changed"));
    } catch (err) {
      const details = err?.response?.data?.error || err?.message || "Failed to delete product";
      toast(details, "error");
    }
  };

  const deleteOrder = async (id) => {
    if (!confirm(t("admin.confirmDeleteOrder"))) return;
    try {
      await apiDeleteOrder(id);
      await reload();
      window.dispatchEvent(new Event("orders:changed"));
    } catch (err) {
      const details = err?.response?.data?.error || err?.message || "Failed to delete order";
      toast(details, "error");
    }
  };

  const clearOrders = async () => {
    if (!confirm(t("admin.confirmClearHistory"))) return;
    try {
      await clearAllOrders();
      await reload();
      window.dispatchEvent(new Event("orders:changed"));
    } catch (err) {
      const details = err?.response?.data?.error || err?.message || "Failed to clear orders";
      toast(details, "error");
    }
  };

  const q = search.toLowerCase();

  const filteredUsers = q
    ? users.filter(
        (user) => (user.username || "").toLowerCase().includes(q)
          || (user.email || "").toLowerCase().includes(q),
      )
    : users;

  const filteredProducts = q
    ? products.filter(
        (product) => (product.name || "").toLowerCase().includes(q)
          || (product.category || "").toLowerCase().includes(q),
      )
    : products;

  const filteredOrders = q
    ? orders.filter((order) =>
        (order.username || "").toLowerCase().includes(q)
        || String(order.id).toLowerCase().includes(q)
        || (order.items || []).some((item) => (item.name || "").toLowerCase().includes(q)),
      )
    : orders;

  const TABS = [
    { key: "stats", label: t("admin.tabOverview") },
    { key: "accounts", label: t("admin.tabAccounts") },
    { key: "orders", label: t("admin.tabOrders") },
    { key: "products", label: t("admin.tabProducts") },
  ];

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
          {loading && <span className={styles.badge}>...</span>}
        </div>
        <Link to="/" className={styles.backLink}>{t("admin.backToHome")}</Link>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}><div className={styles.statValue}>{users.length}</div><div className={styles.statLabel}>{t("admin.accounts")}</div></div>
        <div className={styles.statCard}><div className={styles.statValue}>{orders.length}</div><div className={styles.statLabel}>{t("admin.ordersCount")}</div></div>
        <div className={styles.statCard}><div className={styles.statValue}>{totalItemsSold}</div><div className={styles.statLabel}>{t("admin.itemsSold")}</div></div>
        <div className={styles.statCard}><div className={styles.statValue}>{formatPrice(totalRevenue)}</div><div className={styles.statLabel}>{t("admin.totalRevenue")}</div></div>
        <div className={styles.statCard}><div className={styles.statValue}>{products.length}</div><div className={styles.statLabel}>{t("admin.listedProducts")}</div></div>
        <div className={styles.statCard}><div className={styles.statValue}>{favCount}</div><div className={styles.statLabel}>{t("admin.favoritesCount")}</div></div>
        <div className={styles.statCard}><div className={styles.statValue}>{cartCount}</div><div className={styles.statLabel}>{t("admin.inCartNow")}</div></div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            className={`${styles.tab} ${tab === tabItem.key ? styles.tabActive : ""}`}
            onClick={() => {
              setTab(tabItem.key);
              setSearch("");
              setExpandedOrder(null);
            }}
          >
            {tabItem.label}
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
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{fmtDate(order.date)}</td>
                      <td>{order.username || t("admin.guest")}</td>
                      <td>{order.totalItems || 0}</td>
                      <td>{formatPrice(order.total)}</td>
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
                  {users.slice(0, 5).map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username || "-"}</td>
                      <td>{user.email || "-"}</td>
                      <td><span className={`${styles.badge} ${user.isAdmin ? styles.badgeAdmin : styles.badgeUser}`}>{user.isAdmin ? "admin" : "user"}</span></td>
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
                  {filteredUsers.map((user) => {
                    const userOrders = orders.filter((order) => String(order.userId) === String(user.id));
                    const userSpent = userOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
                    return (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.username || "-"}</td>
                        <td>{user.email || "-"}</td>
                        <td><span className={`${styles.badge} ${user.isAdmin ? styles.badgeAdmin : styles.badgeUser}`}>{user.isAdmin ? "admin" : "user"}</span></td>
                        <td>{userOrders.length}</td>
                        <td>{formatPrice(userSpent)}</td>
                        <td>
                          <div className={styles.actionRow}>
                            <button className={styles.successBtn} onClick={() => toggleAdmin(user)}>{user.isAdmin ? t("admin.revokeAdmin") : t("admin.grantAdmin")}</button>
                            <button className={styles.dangerBtn} onClick={() => deleteUser(user.id)}>{t("admin.deleteUser")}</button>
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
                  {filteredOrders.map((order) => (
                    <React.Fragment key={order.id}>
                      <tr
                        className={expandedOrder === order.id ? styles.expandedRow : ""}
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      >
                        <td>{order.id}</td>
                        <td>{fmtDate(order.date)}</td>
                        <td>{order.username || t("admin.guest")}</td>
                        <td>{order.totalItems || 0}</td>
                        <td>{formatPrice(order.total)}</td>
                        <td>
                          <div className={styles.actionRow}>
                            <button className={styles.successBtn} onClick={(e) => { e.stopPropagation(); setExpandedOrder(expandedOrder === order.id ? null : order.id); }}>
                              {expandedOrder === order.id ? t("admin.collapse") : t("admin.details")}
                            </button>
                            <button className={styles.dangerBtn} onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}>{t("admin.deleteOrder")}</button>
                          </div>
                        </td>
                      </tr>
                      {expandedOrder === order.id && (
                        <tr>
                          <td colSpan={6} className={styles.orderDetail}>
                            <div className={styles.orderItems}>
                              {(order.items || []).map((item, idx) => (
                                <div key={`${order.id}-${idx}`} className={styles.orderItem}>
                                  {item.image && <img src={item.image} alt="" className={styles.productImg} />}
                                  <div className={styles.orderItemInfo}>
                                    <strong>{item.name || "-"}</strong>
                                    <span>{item.quantity} x {formatPrice(item.price)}</span>
                                  </div>
                                  <div className={styles.orderItemTotal}>
                                    {formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}
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
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.image ? <img src={product.image} alt="" className={styles.productImg} /> : "-"}</td>
                      <td>{product.id}</td>
                      <td>{product.name || "-"}</td>
                      <td>{product.category || "-"}</td>
                      <td>{formatPrice(product.price)}</td>
                      <td>
                        <div className={styles.actionRow}>
                          <button className={styles.dangerBtn} onClick={() => deleteProduct(product.id)}>{t("admin.deleteProduct")}</button>
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
