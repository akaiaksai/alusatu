import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Cart.module.css";
import formatPrice, { toPriceKzt, formatKzt } from "../../utils/formatPrice";
import { createOrder, getProfile } from "../../api/users.api";
import { useAuth, useCart } from "../../store";
import { useToast } from "../../components/Toast/Toast";
import { useTranslation } from "../../i18n";

const Cart = () => {
  const navigate = useNavigate();
  const { user, token, updateProfile } = useAuth();
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();
  const toast = useToast();
  const { t } = useTranslation();
  const [paymentMessage, setPaymentMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupPoint, setPickupPoint] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [courierAddress, setCourierAddress] = useState("");
  const receiptRef = useRef(null);

  const pickupPoints = [
    { address: t("cart.point1Address"), hours: t("cart.point1Hours") },
    { address: t("cart.point2Address"), hours: t("cart.point2Hours") },
    { address: t("cart.point3Address"), hours: t("cart.point3Hours") },
  ];

  const pickupDates = (() => {
    const dates = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    for (let i = 0; i < 3; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + daysUntilMonday + i * 2);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  })();

  useEffect(() => {
    if (token) {
      getProfile()
        .then((serverUser) => {
          if (serverUser && typeof serverUser.balance === "number") {
            updateProfile({ balance: serverUser.balance });
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const total = cart.reduce((sum, item) => sum + toPriceKzt(item.price) * item.quantity, 0);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const freeShippingThreshold = 50000;
  const courierFee = 3500;
  const shipping = deliveryMethod === "courier"
    ? (total >= freeShippingThreshold ? 0 : courierFee)
    : 0;
  const finalTotal = total + shipping;
  const shippingProgress = deliveryMethod === "courier" ? Math.min(100, (total / freeShippingThreshold) * 100) : 100;
  const userBalance = user?.balance || 0;
  const insufficientFunds = user && cart.length > 0 && userBalance < finalTotal;

  const selectedPoint = pickupPoints[pickupPoint];

  const handleCheckout = async () => {
    if (!user || !token) {
      toast(t("cart.loginToCheckout"), "error");
      return;
    }

    if (userBalance < finalTotal) {
      toast(
        t("cart.insufficientFundsMsg", { balance: formatKzt(userBalance), total: formatKzt(finalTotal) }),
        "error"
      );
      return;
    }

    if (!pickupDate) {
      toast(t("cart.selectPickupDate"), "error");
      return;
    }

    if (deliveryMethod === "courier" && !courierAddress.trim()) {
      toast(t("cart.enterCourierAddress"), "error");
      return;
    }

    setIsProcessing(true);
    setPaymentMessage("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const orderItems = cart.map((item) => ({
        productId: item.id,
        name: item.name,
        price: toPriceKzt(item.price),
        quantity: item.quantity,
        image: item.image,
      }));

      const apiOrder = await createOrder({
        items: orderItems,
        total: finalTotal,
        totalItems,
        pickupDate,
        deliveryMethod,
        deliveryAddress: deliveryMethod === "courier" ? courierAddress.trim() : "",
        pickupAddress: deliveryMethod === "pickup" ? selectedPoint.address : "",
      });

      if (typeof apiOrder.balance === "number") {
        updateProfile({ balance: apiOrder.balance });
      }

      const order = {
        id: apiOrder._id || Date.now(),
        date: apiOrder.createdAt || new Date().toISOString(),
        userId: user.id || user._id || null,
        username: user.username || t("cart.guest"),
        items: orderItems.map((i) => ({
          id: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
        })),
        total: finalTotal,
        totalItems,
        pickupDate,
        deliveryMethod,
        deliveryAddress: deliveryMethod === "courier" ? courierAddress.trim() : "",
        pickupAddress: deliveryMethod === "pickup" ? selectedPoint.address : "",
        pickupHours: deliveryMethod === "pickup" ? selectedPoint.hours : "",
        status: apiOrder.status || "paid",
        paidAt: apiOrder.paidAt || apiOrder.createdAt || new Date().toISOString(),
        shippedAt: apiOrder.shippedAt || null,
        deliveryDate: apiOrder.deliveryDate || null,
        receipt: apiOrder.receipt || null,
        _fromApi: true,
      };

      try {
        const prev = JSON.parse(localStorage.getItem("orders") || "[]");
        prev.push(order);
        localStorage.setItem("orders", JSON.stringify(prev));
      } catch { /* ignore */ }

      clearCart();
      window.dispatchEvent(new Event("orders:changed"));
      setReceipt(normalizeReceipt(order));
    } catch (err) {
      if (err?.response?.data?.code === "INSUFFICIENT_FUNDS") {
        const bal = err.response.data.balance ?? 0;
        updateProfile({ balance: bal });
        toast(
          t("cart.insufficientOnServer", { balance: formatKzt(bal) }),
          "error"
        );
      } else if (err?.response?.data?.code === "PRODUCT_SOLD") {
        toast(err.response.data.error || t("cart.productAlreadySold"), "error");
      } else if (err?.response?.data?.code === "OWN_PRODUCT_PURCHASE") {
        toast(err.response.data.error || "Вы не можете купить собственное объявление", "error");
      } else {
        console.error("Order error:", err?.response?.data || err?.message || err);
        toast(t("cart.orderError"), "error");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    const el = receiptRef.current;
    if (!el) return;
    const win = window.open("", "_blank", "width=420,height=700");
    win.document.write(`
      <html><head><title>Чек Alu-Satu</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier New', monospace; padding: 20px; color: #000; background: #fff; }
        .receipt { max-width: 380px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
        .header h2 { font-size: 18px; margin-bottom: 4px; }
        .header p { font-size: 11px; color: #555; }
        .meta { font-size: 12px; margin-bottom: 12px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
        .meta div { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .items { margin-bottom: 12px; }
        .item { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dotted #ddd; }
        .item-name { flex: 1; }
        .item-qty { width: 40px; text-align: center; }
        .item-price { width: 90px; text-align: right; font-weight: bold; }
        .total { border-top: 2px dashed #000; padding-top: 10px; font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 16px; }
        .footer { text-align: center; font-size: 11px; color: #888; border-top: 1px dashed #ccc; padding-top: 10px; }
        .footer p { margin-bottom: 3px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${el.innerHTML}
      <script>window.print();</script>
      </body></html>
    `);
    win.document.close();
  };

  const handleCloseReceipt = () => {
    setReceipt(null);
    navigate("/catalog");
  };

  const handleContinueShopping = () => {
    navigate("/catalog");
  };

  const fallbackImg = (seed) => `https://source.unsplash.com/featured/400x400?product&sig=${encodeURIComponent(String(seed ?? "0"))}`;

  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const normalizeReceipt = (orderLike) => {
    const receiptData = orderLike?.receipt || null;
    const sourceItems = Array.isArray(receiptData?.items) ? receiptData.items : (orderLike?.items || []);
    const items = sourceItems.map((item) => ({
      productId: item.productId || item.id || null,
      name: item.name || "",
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      image: item.image || "",
    }));

    return {
      id: receiptData?.receiptNumber || orderLike?.id || orderLike?._id || Date.now(),
      date: receiptData?.issuedAt || orderLike?.date || orderLike?.createdAt || new Date().toISOString(),
      username: receiptData?.buyer || orderLike?.username || t("cart.guest"),
      paymentMethod: receiptData?.paymentMethod || "online",
      items,
      total: Number(receiptData?.total ?? orderLike?.total ?? 0),
      totalItems: Number(receiptData?.totalItems ?? orderLike?.totalItems ?? items.reduce((sum, item) => sum + item.quantity, 0)),
      pickupDate: receiptData?.pickupDate || orderLike?.pickupDate || "",
      deliveryMethod: receiptData?.deliveryMethod || orderLike?.deliveryMethod || "pickup",
      deliveryAddress: receiptData?.deliveryAddress || orderLike?.deliveryAddress || "",
      pickupAddress: receiptData?.pickupAddress || orderLike?.pickupAddress || "",
      pickupHours: receiptData?.pickupHours || orderLike?.pickupHours || "",
    };
  };

  const isListedId = (id) => /^[a-f0-9]{24}$/i.test(String(id ?? ''));

  return (
    <div className={styles.container}>
      <h1>{t("cart.title")}</h1>
      
      {paymentMessage && (
        <div className={`${styles.notification} ${styles.error}`}>
          {paymentMessage}
        </div>
      )}
      {receipt && (
        <div className={styles.receiptInline}>
          <div ref={receiptRef} className={styles.receiptContent}>
            <div className="receipt">
                <div className="header">
                  <h2>ALU-SATU</h2>
                  <p>{t("cart.receiptMarketplace")}</p>
                  <p>{t("cart.receiptAddress")}</p>
                  <p>{t("cart.receiptPhone")}</p>
                </div>

                <div className="meta">
                  <div><span>{t("cart.receiptNumber")}:</span><span>{receipt.id}</span></div>
                  <div><span>{t("cart.receiptDate")}:</span><span>{fmtDate(receipt.date)}</span></div>
                  <div><span>{t("cart.receiptBuyer")}:</span><span>{receipt.username}</span></div>
                  <div><span>{t("cart.receiptPayment")}:</span><span>{t("cart.receiptOnline")}</span></div>
                  {receipt.pickupDate && (
                    <div><span>{t("cart.receiptPickupDate")}:</span><span>{new Date(receipt.pickupDate).toLocaleDateString("ru-RU")}</span></div>
                  )}
                </div>

                <div className="items">
                  {receipt.items.map((item, idx) => (
                    <div key={idx} className="item">
                      <span className="item-name">{item.name}</span>
                      <span className="item-qty">×{item.quantity}</span>
                      <span className="item-price">{formatKzt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="total">
                  <span>{t("cart.receiptTotal")}:</span>
                  <span>{formatKzt(receipt.total)}</span>
                </div>

                <div className="footer">
                  <p>{t("cart.receiptThankYou")}</p>
                  <p>{t("cart.receiptItems")}: {receipt.totalItems} {t("cart.pcs")}</p>
                  <p>alu-satu.com</p>
                </div>
            </div>
          </div>

          <div className={styles.pickupInfo}>
            <h3>{receipt.deliveryMethod === "courier" ? t("cart.courierDeliveryTitle") : t("cart.pickupInfoTitle")}</h3>
            <div className={styles.pickupDetails}>
              <div className={styles.pickupRow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div>
                  <strong>{receipt.deliveryMethod === "courier" ? t("cart.deliveryAddressLabel") : t("cart.pickupAddress")}</strong>
                  <p>{receipt.deliveryMethod === "courier" ? receipt.deliveryAddress : (receipt.pickupAddress || selectedPoint.address)}</p>
                </div>
              </div>
              {receipt.deliveryMethod === "pickup" && (
                <div className={styles.pickupRow}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <div>
                    <strong>{t("cart.pickupSchedule")}</strong>
                    <p>{receipt.pickupHours || selectedPoint.hours}</p>
                  </div>
                </div>
              )}
              {receipt.pickupDate && (
                <div className={styles.pickupRow}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <div>
                    <strong>{t("cart.pickupYourDate")}</strong>
                    <p>{new Date(receipt.pickupDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                </div>
              )}
              <div className={styles.pickupRow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <div>
                  <strong>{t("cart.pickupContact")}</strong>
                  <p>{t("cart.receiptPhone")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.receiptActions}>
            <button className={styles.printBtn} onClick={handlePrintReceipt}>
              {t("cart.printReceipt")}
            </button>
            <button className={styles.closeReceiptBtn} onClick={handleCloseReceipt}>
              {t("cart.goToCatalog")}
            </button>
          </div>
        </div>
      )}
      
      {receipt ? null : cart.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          </div>
          <h2 className={styles.emptyTitle}>{t("cart.emptyTitle")}</h2>
          <p className={styles.emptyText}>{t("cart.emptyText")}</p>
          <button className={styles.emptyBtn} onClick={handleContinueShopping}>{t("cart.goToShopping")}</button>
        </div>
      ) : (
        <>
          <div className={styles.shippingBar}>
            {deliveryMethod === "pickup" ? (
              <p className={styles.shippingText}>{t("cart.pickupFreeShipping")}</p>
            ) : total >= freeShippingThreshold ? (
              <p className={styles.shippingText}>{t("cart.freeShipping")}</p>
            ) : (
              <p className={styles.shippingText}>
                {t("cart.untilFreeShipping")}: <strong>{formatKzt(freeShippingThreshold - total)}</strong>
              </p>
            )}
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${shippingProgress}%` }} />
            </div>
          </div>

          <div className={styles.cartLayout}>
            <div className={styles.cartItems}>
              <div className={styles.itemsHeader}>
                <span>{t("cart.product")}</span>
                <span>{totalItems} {t("cart.pcs")}</span>
              </div>
              {cart.map((item) => (
                <div key={item.id} className={styles.item}>
                  <img
                    src={item.image}
                    alt={item.name}
                    className={styles.itemImg}
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (el.dataset.fallbackApplied) return;
                      el.dataset.fallbackApplied = "1";
                      el.src = fallbackImg(item.id);
                    }}
                  />
                  <div className={styles.itemInfo}>
                    <h3>{item.name}</h3>
                    <p className={styles.itemPrice}>{formatPrice(item.price)}</p>
                  </div>
                  <div className={styles.itemControls}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={isListedId(item.id)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={isListedId(item.id)}>+</button>
                  </div>
                  <div className={styles.itemTotal}>
                    <p>{formatPrice(item.price * item.quantity)}</p>
                  </div>
                  <button 
                    className={styles.removeBtn}
                    onClick={() => removeFromCart(item.id)}
                    title={t("cart.remove")}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.summary}>
              <h2>{t("cart.summary")}</h2>
              <div className={styles.summaryRow}>
                <span>{t("cart.products")} ({totalItems})</span>
                <span>{formatKzt(total)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>{deliveryMethod === "courier" ? t("cart.courierShipping") : t("cart.shipping")}</span>
                <span>{deliveryMethod === "pickup" ? t("cart.shippingFree") : shipping === 0 ? t("cart.shippingFree") : formatKzt(shipping)}</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryTotal}>
                <span>{t("cart.toPay")}</span>
                <span>{formatKzt(finalTotal)}</span>
              </div>

              {user && (
                <div className={styles.balanceRow}>
                  <span>{t("cart.yourBalance")}</span>
                  <span className={insufficientFunds ? styles.balanceInsufficient : styles.balanceOk}>
                    {formatKzt(userBalance)}
                  </span>
                </div>
              )}
              {insufficientFunds && (
                <div className={styles.balanceWarning}>
                  {t("cart.notEnough")} {formatKzt(finalTotal - userBalance)}. {t("cart.topUpInProfile")}
                </div>
              )}

              <div className={styles.pickupDateRow}>
                <label className={styles.pickupLabel}>{t("cart.deliveryMethodLabel")}</label>
                <div className={styles.deliveryToggle}>
                  <button
                    className={`${styles.deliveryBtn} ${deliveryMethod === "pickup" ? styles.deliveryBtnActive : ""}`}
                    onClick={() => setDeliveryMethod("pickup")}
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {t("cart.selfPickup")}
                  </button>
                  <button
                    className={`${styles.deliveryBtn} ${deliveryMethod === "courier" ? styles.deliveryBtnActive : ""}`}
                    onClick={() => setDeliveryMethod("courier")}
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    {t("cart.courierDelivery")}
                  </button>
                </div>
              </div>

              {deliveryMethod === "pickup" && (
                <div className={styles.pickupDateRow}>
                  <label className={styles.pickupLabel}>{t("cart.pickupPoint")}</label>
                  <div className={styles.pickupOptions}>
                    {pickupPoints.map((point, i) => (
                      <button
                        key={i}
                        className={`${styles.pickupOption} ${pickupPoint === i ? styles.pickupOptionActive : ""}`}
                        onClick={() => setPickupPoint(i)}
                        type="button"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>{point.address}</span>
                        <small>{point.hours}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {deliveryMethod === "courier" && (
                <div className={styles.pickupDateRow}>
                  <label className={styles.pickupLabel}>{t("cart.courierAddressLabel")}</label>
                  <input
                    type="text"
                    className={styles.courierInput}
                    value={courierAddress}
                    onChange={(e) => setCourierAddress(e.target.value)}
                    placeholder={t("cart.courierAddressPlaceholder")}
                  />
                  {shipping > 0 && (
                    <small className={styles.courierHint}>
                      {t("cart.courierFeeHint", { fee: formatKzt(courierFee), threshold: formatKzt(freeShippingThreshold) })}
                    </small>
                  )}
                </div>
              )}

              <div className={styles.pickupDateRow}>
                <label className={styles.pickupLabel}>{t("cart.pickupDate")}</label>
                <div className={styles.pickupOptions}>
                  {pickupDates.map((d) => {
                    const dateObj = new Date(d + "T00:00:00");
                    const label = dateObj.toLocaleDateString(t("cart.dateLocale"), { weekday: "short", day: "numeric", month: "short" });
                    return (
                      <button
                        key={d}
                        className={`${styles.pickupOption} ${styles.pickupDateOption} ${pickupDate === d ? styles.pickupOptionActive : ""}`}
                        onClick={() => setPickupDate(d)}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                className={styles.checkoutBtn}
                onClick={handleCheckout}
                disabled={isProcessing || insufficientFunds}
              >
                {isProcessing ? t("cart.processing") : insufficientFunds ? t("cart.insufficientFunds") : t("cart.checkout")}
              </button>
              <button 
                className={styles.continueShopping}
                onClick={handleContinueShopping}
                disabled={isProcessing}
              >
                {t("cart.continueShopping")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
