"use client";

/**
 * CheckoutFlow — Address → Payment → Review → real Cash-on-Delivery order (POST /orders).
 *
 * - The server recalculates prices, checks stock and creates the order; the UI never clears
 *   the cart itself — it re-reads the server cart after the server confirms.
 * - One Idempotency-Key per checkout attempt, reused on retries (a timeout or network error
 *   can be retried safely without a duplicate order). Changing the address or payment method
 *   starts a new attempt with a new key.
 * - Only Cash on Delivery is available; payment options come from the server.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { useCart } from "@/features/cart/CartProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { newIdempotencyKey, retryAfterText } from "@/lib/api";
import { formatAddress, formatPrice } from "@/lib/format";
import AddressForm from "@/components/store/AddressForm";
import OrderSummary from "@/components/store/OrderSummary";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Field";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";

const STEPS = ["Address", "Payment", "Review"];

/* ─── Stepper ──────────────────────────────────────────────────── */
function Stepper({ step, onGoTo }) {
  return (
    <ol className="list-none m-0 p-0 flex items-center" aria-label="Checkout progress">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        const circle = (
          <span
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0
                        ${current || done ? "bg-forest text-cream" : "bg-sand text-muted"}`}
          >
            {done ? <Icon name="check" size={16} strokeWidth={2.5} /> : i + 1}
          </span>
        );
        return (
          <li key={label} className="flex items-center flex-1 last:flex-none" aria-current={current ? "step" : undefined}>
            {done ? (
              <button type="button" onClick={() => onGoTo(i)} className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 bg-transparent border-0 p-0 cursor-pointer text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest rounded">
                {circle}
                <span className="text-xs sm:text-sm font-medium">{label}<span className="sr-only"> (completed, edit)</span></span>
              </button>
            ) : (
              <span className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 ${current ? "text-ink" : "text-muted"}`}>
                {circle}
                <span className="text-xs sm:text-sm font-medium">{label}</span>
              </span>
            )}
            {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-2 sm:mx-4 rounded-full ${done ? "bg-forest" : "bg-line"}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function Panel({ title, icon, children, headingRef }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
      <h2 ref={headingRef} tabIndex={-1} className={`${brandSerif.className} m-0 mb-4 flex items-center gap-2.5 text-[1.2rem] font-bold text-heading outline-none`}>
        <Icon name={icon} size={20} className="text-forest" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ─── Steps ────────────────────────────────────────────────────── */
function AddressStep({
  address,
  savedAddresses = [],
  loadingAddresses = false,
  onSelectAddress,
  onSaveNewAddress,
  onConfirmed,
}) {
  const [userMode, setUserMode] = useState(null); // null = auto, "confirmed" | "picker" | "new"
  const mode = userMode ?? (address ? "confirmed" : savedAddresses.length > 0 ? "picker" : "new");
  const [saveToProfile, setSaveToProfile] = useState(savedAddresses.length < 3);
  const [savingNew, setSavingNew] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (loadingAddresses) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading delivery addresses">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-10 rounded-lg w-48" />
      </div>
    );
  }

  // 1. Confirmed / Selected Address View (Yahi Address)
  if (mode === "confirmed" && address) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-forest bg-sage-50/50 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sage-200 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-cream">
                <Icon name="check" size={14} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-forest">
                Delivery Address Selected
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline">{address.label || "Home"}</Badge>
              {address.isDefault && <Badge variant="secondary">Default</Badge>}
            </div>
          </div>

          <div className="text-sm space-y-1">
            <p className="m-0 font-bold text-ink text-base">{address.name}</p>
            <p className="m-0 text-ink">{address.line1}</p>
            {address.line2 && <p className="m-0 text-muted">{address.line2}</p>}
            <p className="m-0 text-ink font-medium">
              {address.city}, {address.state} — {address.pincode}
            </p>
            <p className="m-0 pt-1 flex items-center gap-1.5 text-xs text-muted">
              <Icon name="phone" size={14} className="text-forest" />
              <span>Contact: <strong className="text-ink">{address.phone}</strong></span>
            </p>
          </div>

          <div className="mt-4 pt-3.5 border-t border-sage-200 flex flex-wrap items-center gap-3">
            <Button size="md" onClick={onConfirmed}>
              Deliver to this Address →
            </Button>
            {savedAddresses.length > 1 ? (
              <Button variant="outline" size="md" onClick={() => setUserMode("picker")}>
                Deliver to another address ({savedAddresses.length} saved)
              </Button>
            ) : (
              <Button variant="outline" size="md" onClick={() => setUserMode("new")}>
                + Use another address
              </Button>
            )}
            {savedAddresses.length < 3 && savedAddresses.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setUserMode("new")}>
                + Add new address ({savedAddresses.length}/3)
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted px-1">
          <span>Need to update your address book?</span>
          <Link href="/account/addresses" className="font-semibold text-forest hover:underline">
            Manage Saved Addresses (max 3) →
          </Link>
        </div>
      </div>
    );
  }

  // 2. Picker View (Dusra Address - Pick from saved addresses)
  if (mode === "picker" || (!address && savedAddresses.length > 0 && mode !== "new")) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="m-0 text-sm font-bold text-ink">Choose a delivery address</h3>
            <p className="m-0 text-xs text-muted">
              Select one of your {savedAddresses.length} saved addresses (max 3 allowed)
            </p>
          </div>
          {savedAddresses.length < 3 && (
            <Button variant="outline" size="sm" onClick={() => setUserMode("new")}>
              + Add New Address ({savedAddresses.length}/3)
            </Button>
          )}
        </div>

        <div className="grid gap-3">
          {savedAddresses.map((a) => {
            const id = a.id || a._id;
            const isSelected =
              (address?.id && address.id === id) ||
              (address?._id && address._id === id) ||
              (address?.line1 === a.line1 && address?.name === a.name);

            return (
              <div
                key={id || a.line1}
                className={`rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-forest bg-sage-50/50 shadow-sm ring-1 ring-forest"
                    : "border-line bg-white hover:border-sage-300"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink">{a.name}</span>
                      <Badge variant="outline">{a.label || "Home"}</Badge>
                      {a.isDefault && <Badge variant="secondary">Default</Badge>}
                    </div>
                    <p className="m-0 text-xs text-ink">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                    <p className="m-0 text-xs text-ink">{a.city}, {a.state} — {a.pincode}</p>
                    <p className="m-0 text-xs text-muted flex items-center gap-1">
                      <Icon name="phone" size={13} /> {a.phone}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      size="sm"
                      variant={isSelected ? "primary" : "outline"}
                      onClick={() => {
                        onSelectAddress(a);
                        setUserMode("confirmed");
                      }}
                    >
                      {isSelected ? "Deliver Here ✓" : "Deliver Here"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
          {address && (
            <Button variant="ghost" size="sm" onClick={() => setUserMode("confirmed")}>
              ← Keep current address
            </Button>
          )}
          {savedAddresses.length < 3 ? (
            <Button variant="outline" size="sm" onClick={() => setUserMode("new")}>
              + Deliver to a new address ({savedAddresses.length}/3 saved)
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setUserMode("new")}>
              + Deliver to a different address (for this order)
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 3. New Address Form View
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <h3 className="m-0 text-sm font-bold text-ink">Enter Delivery Address</h3>
          <p className="m-0 text-xs text-muted">
            {savedAddresses.length >= 3
              ? "You have 3 saved addresses in your profile (maximum limit). This address will be used for this order."
              : `You have ${savedAddresses.length} of 3 addresses saved in your profile.`}
          </p>
        </div>
        {savedAddresses.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setUserMode(address ? "confirmed" : "picker")}>
            ← Back to saved addresses
          </Button>
        )}
      </div>

      {saveError && <FormMessage tone="error">{saveError}</FormMessage>}

      <AddressForm
        initial={address ?? undefined}
        showSaveOptions={false}
        submitLabel={savingNew ? "Saving…" : "Deliver to This Address"}
        onCancel={savedAddresses.length > 0 ? () => setUserMode(address ? "confirmed" : "picker") : undefined}
        onSave={async (formData) => {
          setSaveError("");
          setSavingNew(true);
          try {
            await onSaveNewAddress(formData, saveToProfile && savedAddresses.length < 3);
            setUserMode("confirmed");
          } catch (err) {
            setSaveError(err.message || "Could not save address");
          } finally {
            setSavingNew(false);
          }
        }}
      />

      {savedAddresses.length < 3 && (
        <div className="rounded-lg bg-sand/60 p-3 text-xs text-ink flex items-center gap-2">
          <input
            id="save-to-profile-chk"
            type="checkbox"
            checked={saveToProfile}
            onChange={(e) => setSaveToProfile(e.target.checked)}
            className="w-4 h-4 accent-forest cursor-pointer"
          />
          <label htmlFor="save-to-profile-chk" className="cursor-pointer font-medium">
            Save this address to my profile for future orders ({savedAddresses.length}/3 saved)
          </label>
        </div>
      )}
    </div>
  );
}

function PaymentStep({ methods, loadError, selected, onSelect }) {
  if (loadError) return <FormMessage tone="error">{loadError}</FormMessage>;
  if (!methods) return <Skeleton className="h-28 rounded-xl" />;
  return (
    <fieldset className="m-0 p-0 border-0 grid gap-3">
      <legend className="sr-only">Choose a payment method</legend>
      {methods.map((m) => (
        <label
          key={m.id}
          className={`flex items-center gap-3.5 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest
                      ${!m.enabled ? "opacity-60 cursor-not-allowed border-line" : selected === m.id ? "border-forest bg-sage-50/50 cursor-pointer" : "border-line hover:border-sage-300 cursor-pointer"}`}
        >
          <input type="radio" name="payment" disabled={!m.enabled} checked={selected === m.id} onChange={() => onSelect(m.id)} className="w-4 h-4 accent-forest" />
          <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-sand text-forest flex-shrink-0">
            <Icon name={m.id === "COD" ? "cash" : "card"} size={22} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              {m.name}
              {m.badge && <span className="rounded-full bg-sand px-2 py-0.5 text-[0.6875rem] font-medium text-muted">{m.badge}</span>}
            </span>
            <span className="block text-xs text-muted">{m.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function ReviewStep({ address, payment, lines, agreed, onAgree, error, couponCode, onCouponCode, couponQuote, couponError, couponBusy, onApplyCoupon }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-4">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-muted">Deliver to</p>
          <p className="m-0 mt-1.5 text-sm font-semibold text-ink">{address.name}</p>
          <p className="m-0 mt-0.5 text-sm text-muted">{formatAddress(address)}</p>
          <p className="m-0 mt-0.5 text-sm text-muted">{address.phone}</p>
        </div>
        <div className="rounded-xl border border-line p-4">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-muted">Payment</p>
          <p className="m-0 mt-1.5 text-sm font-semibold text-ink">{payment.name}</p>
          <p className="m-0 mt-0.5 text-sm text-muted">{payment.description}</p>
        </div>
      </div>
      <ul className="list-none m-0 p-0 rounded-xl border border-line divide-y divide-line">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="text-ink">
              {l.product.name}
              {l.option && <span className="text-muted"> · {l.option.name}</span>}
              <span className="text-muted"> × {l.qty}</span>
            </span>
            <span className="font-medium text-ink">{formatPrice(l.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-xs text-muted">Final prices and stock are confirmed by the store when you place the order.</p>
      <div className="grid gap-2 rounded-xl border border-line bg-[#f7f5ed] p-4">
        <label htmlFor="checkout-coupon" className="text-sm font-medium text-ink">Coupon code</label>
        <div className="flex flex-wrap gap-2">
          <input id="checkout-coupon" value={couponCode} maxLength={32} onChange={(event) => onCouponCode(event.target.value.toUpperCase())} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-base sm:text-sm" autoComplete="off" />
          <Button type="button" variant="outline" disabled={couponBusy || !couponCode.trim()} onClick={onApplyCoupon}>{couponBusy ? "Checking…" : couponQuote ? "Recheck code" : "Apply code"}</Button>
        </div>
        {couponError && <FormMessage tone="error">{couponError}</FormMessage>}
        {couponQuote && <FormMessage tone="success">{couponQuote.code} applied · {formatPrice(couponQuote.discount)} off this order.</FormMessage>}
      </div>
      <div>
        <Checkbox label="I agree to the Terms & Conditions and Privacy Policy" checked={agreed} onChange={(e) => onAgree(e.target.checked)} />
      </div>
      <FormMessage tone="error">{error}</FormMessage>
    </div>
  );
}

function Confirmation({ order, warning }) {
  const placedDate = new Date(order.createdAt || 0);
  const placedDateFormatted = placedDate.toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Calculate Expected Delivery Date: 7 days after order placed
  const estDate = new Date(placedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const estDeliveryFormatted = estDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-3xl border border-line bg-white p-6 sm:p-10 shadow-sm max-w-2xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-forest text-cream flex items-center justify-center text-3xl mx-auto shadow-sm">
          ✓
        </div>
        <h2 className={`${brandSerif.className} m-0 text-2xl sm:text-3xl font-bold text-[#1f3d24]`}>
          Order Successfully Placed!
        </h2>
        <p className="m-0 text-sm text-muted">
          Thank you for choosing Soil &amp; Soul. Your plants and botanical essentials are being prepared for transit.
        </p>
      </div>

      {/* Date & Time Highlights Card */}
      <div className="grid gap-3 sm:grid-cols-2 rounded-2xl bg-[#faf8f2] border border-line p-4 sm:p-5">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">
            📅 Order Placed Date &amp; Time
          </span>
          <span className="text-sm font-bold text-ink block">{placedDateFormatted}</span>
          <span className="text-xs text-muted block">Order #{order.orderNumber}</span>
        </div>

        <div className="space-y-1 sm:border-l sm:border-line sm:pl-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-forest block">
            🚚 Expected Delivery Date
          </span>
          <span className="text-sm font-bold text-forest block">{estDeliveryFormatted}</span>
          <span className="text-xs text-muted block">Standard Botanical Transit (7 days)</span>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="space-y-2 pt-1">
        <p className="m-0 text-xs font-semibold text-ink">Delivery Progress Tracker:</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="flex flex-col items-center">
            <span className="w-7 h-7 rounded-full bg-forest text-cream text-xs font-bold flex items-center justify-center">1</span>
            <span className="text-[11px] font-semibold text-forest mt-1">Placed</span>
            <span className="text-[10px] text-muted">Confirmed</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="w-7 h-7 rounded-full bg-sage-100 text-forest text-xs font-bold flex items-center justify-center">2</span>
            <span className="text-[11px] font-medium text-ink mt-1">Packing</span>
            <span className="text-[10px] text-muted">Nursery Check</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="w-7 h-7 rounded-full bg-sand text-muted text-xs font-bold flex items-center justify-center">3</span>
            <span className="text-[11px] font-medium text-muted mt-1">Shipped</span>
            <span className="text-[10px] text-muted">Eco-Courier</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="w-7 h-7 rounded-full bg-sand text-muted text-xs font-bold flex items-center justify-center">4</span>
            <span className="text-[11px] font-medium text-muted mt-1">Delivered</span>
            <span className="text-[10px] text-muted">Doorstep</span>
          </div>
        </div>
      </div>

      {/* Summary Details */}
      <div className="rounded-2xl border border-line bg-white p-4 space-y-2 text-sm">
        <div className="flex justify-between items-center border-b border-line pb-2">
          <span className="text-muted">Total Amount (COD):</span>
          <span className="font-bold text-ink text-base">{formatPrice(order.total)}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-muted">
          <span>Payment Method:</span>
          <span className="font-semibold text-ink">Cash on Delivery (Pay upon delivery)</span>
        </div>
        {order.deliveryAddress && (
          <div className="pt-2 border-t border-line text-xs text-muted">
            <span className="block font-semibold text-ink mb-0.5">Delivery Address:</span>
            <span>
              {order.deliveryAddress.recipientName}, {order.deliveryAddress.addressLine1},{" "}
              {order.deliveryAddress.city}, {order.deliveryAddress.state} — {order.deliveryAddress.postalCode}
            </span>
          </div>
        )}
      </div>

      {warning && <FormMessage tone="info">{warning}</FormMessage>}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button href={`/account/orders/${order.orderNumber}`} size="lg">
          Track Order Details →
        </Button>
        <Button href="/shop" variant="outline" size="lg">
          Continue Shopping
        </Button>
      </div>
    </div>
  );
}

const toApiAddress = (a) => ({
  recipientName: a.name.trim(),
  phone: a.phone.trim(),
  addressLine1: a.line1.trim(),
  addressLine2: (a.line2 ?? "").trim(),
  city: a.city.trim(),
  state: a.state,
  postalCode: a.pincode.trim(),
  country: "India",
});

/* ─── Flow ─────────────────────────────────────────────────────── */
export default function CheckoutFlow() {
  const { authRequest } = useAuth();
  const { isReady, isAuthenticated, lines, totals, refresh } = useCart();
  const [address, setAddress] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [paymentId, setPaymentId] = useState("COD");
  const [methods, setMethods] = useState(null);
  const [methodsError, setMethodsError] = useState("");
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [placed, setPlaced] = useState(null); // { order, warning }
  const [couponCode, setCouponCode] = useState("");
  const [couponQuote, setCouponQuote] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const headingRef = useRef(null);
  const attemptKey = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;

    authRequest("/orders/payment-methods")
      .then((data) => !cancelled && setMethods(data.paymentMethods))
      .catch((err) => !cancelled && setMethodsError(err.message));

    authRequest("/users/me/addresses")
      .then((data) => {
        if (cancelled) return;
        const list = data.addresses || [];
        setSavedAddresses(list);
        if (list.length > 0) {
          const def = list.find((a) => a.isDefault) || list[0];
          setAddress(def);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingAddresses(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authRequest]);

  function handleSelectAddress(selected) {
    setAddress(selected);
    attemptKey.current = null;
    setError("");
  }

  async function handleSaveNewAddress(formData, shouldSaveToProfile) {
    if (shouldSaveToProfile && savedAddresses.length < 3) {
      try {
        const res = await authRequest("/users/me/addresses", {
          method: "POST",
          body: formData,
        });
        const updatedList = res.addresses || [];
        setSavedAddresses(updatedList);
        const matched = updatedList[updatedList.length - 1] || formData;
        setAddress(matched);
      } catch (err) {
        setAddress(formData);
      }
    } else {
      setAddress(formData);
    }
    attemptKey.current = null;
    setError("");
  }

  function goTo(next) {
    setError("");
    setStep(next);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function applyCoupon() {
    setCouponBusy(true);
    setCouponError("");
    setCouponQuote(null);
    try {
      const data = await authRequest("/coupons/quote", { method: "POST", body: { code: couponCode } });
      setCouponQuote(data.quote);
      attemptKey.current = null;
    } catch (err) { setCouponError(err.message); }
    finally { setCouponBusy(false); }
  }

  if (placed) return <Confirmation order={placed.order} warning={placed.warning} />;

  if (!isReady) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]" role="status" aria-label="Loading checkout">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-line bg-white">
        <EmptyState icon="lock" title="Sign in to check out" description="Checkout needs an account so you can track your order." action={<Button href="/login?next=/checkout">Sign In</Button>} />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white">
        <EmptyState icon="cart" title="Your cart is empty" description="Add a few things to your cart before checking out." action={<Button href="/shop">Browse Products</Button>} />
      </div>
    );
  }

  if (totals.hasUnavailable) {
    return (
      <div className="rounded-2xl border border-line bg-white">
        <EmptyState icon="cart" title="Your cart needs attention" description="Some items are unavailable or exceed the available stock." action={<Button href="/cart">Review Cart</Button>} />
      </div>
    );
  }

  const payment = methods?.find((m) => m.id === paymentId && m.enabled) ?? null;

  function next() {
    if (step === 0 && !address) return setError("Please enter a delivery address.");
    if (step === 1 && !payment) return setError("Please choose a payment method.");
    goTo(step + 1);
  }

  async function placeOrder() {
    if (!agreed) return setError("Please accept the terms to place your order.");
    if (!attemptKey.current) attemptKey.current = newIdempotencyKey();
    setIsPlacing(true);
    setError("");
    try {
      const data = await authRequest("/orders", {
        method: "POST",
        headers: { "Idempotency-Key": attemptKey.current },
        body: { paymentMethod: payment.id, deliveryAddress: toApiAddress(address), ...(couponQuote ? { couponCode: couponQuote.code } : {}) },
        timeoutMs: 30000,
      });
      setPlaced({ order: data.order, warning: data.warning ?? null });
      attemptKey.current = null;
      refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err.code === "IDEMPOTENCY_KEY_REUSED") attemptKey.current = null;
      if (err.code === "INSUFFICIENT_STOCK" || err.code === "VALIDATION_ERROR") refresh();
      // Network errors and timeouts keep the same key: retrying cannot create a second order.
      setError(`${err.message}${err.status === 429 ? retryAfterText(err) : ""}`);
    } finally {
      setIsPlacing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] items-start">
      <div className="min-w-0 space-y-5">
        <div className="rounded-2xl border border-line bg-white px-4 sm:px-6 py-4">
          <Stepper step={step} onGoTo={goTo} />
        </div>

        {step === 0 && (
          <Panel title="1. Delivery Address" icon="pin" headingRef={headingRef}>
            <AddressStep
              address={address}
              savedAddresses={savedAddresses}
              loadingAddresses={loadingAddresses}
              onSelectAddress={handleSelectAddress}
              onSaveNewAddress={handleSaveNewAddress}
              onConfirmed={() => next()}
            />
          </Panel>
        )}
        {step === 1 && (
          <Panel title="2. Payment Method" icon="card" headingRef={headingRef}>
            <PaymentStep
              methods={methods}
              loadError={methodsError}
              selected={paymentId}
              onSelect={(id) => {
                setPaymentId(id);
                attemptKey.current = null;
              }}
            />
          </Panel>
        )}
        {step === 2 && (
          <Panel title="3. Review Order" icon="bag" headingRef={headingRef}>
            <ReviewStep
              address={address} payment={payment} lines={lines} agreed={agreed}
              onAgree={(v) => { setAgreed(v); setError(""); }} error={error}
              couponCode={couponCode}
              onCouponCode={(value) => { setCouponCode(value); setCouponQuote(null); setCouponError(""); attemptKey.current = null; }}
              couponQuote={couponQuote} couponError={couponError} couponBusy={couponBusy} onApplyCoupon={applyCoupon}
            />
          </Panel>
        )}

        {error && step < 2 && <FormMessage tone="error">{error}</FormMessage>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => goTo(step - 1)}><Icon name="arrow-left" size={16} />Back</Button>
          ) : (
            <Button variant="ghost" href="/cart"><Icon name="arrow-left" size={16} />Back to Cart</Button>
          )}
          {step < 2 ? (
            <Button size="lg" onClick={next}>
              Continue to {STEPS[step + 1]} <Icon name="arrow-right" size={17} />
            </Button>
          ) : (
            <Button size="lg" onClick={placeOrder} disabled={isPlacing} aria-busy={isPlacing}>
              <Icon name="lock" size={16} />
              {isPlacing ? "Placing order…" : `Place Order · ${formatPrice(Math.max(0, totals.total - (couponQuote?.discount ?? 0)))}`}
            </Button>
          )}
        </div>
        {step === 2 && (
          <p className="m-0 text-xs text-muted">
            Problems with an earlier attempt? <Link href="/account/orders" className="text-forest">Check your orders</Link> before trying again.
          </p>
        )}
      </div>

      <div className="lg:sticky lg:top-28 space-y-3">
        <OrderSummary totals={{ ...totals, discount: couponQuote?.discount ?? 0, total: Math.max(0, totals.total - (couponQuote?.discount ?? 0)) }} lines={lines} />
      </div>
    </div>
  );
}
