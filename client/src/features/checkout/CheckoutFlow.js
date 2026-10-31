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
function AddressStep({ address, onSave }) {
  const [isEditing, setIsEditing] = useState(!address);
  if (address && !isEditing) {
    return (
      <div className="rounded-xl border border-forest bg-sage-50/50 p-4 text-sm">
        <p className="m-0 font-semibold text-ink">{address.name}</p>
        <p className="m-0 mt-1 text-muted">{formatAddress(address)}</p>
        <p className="m-0 mt-0.5 text-muted">{address.phone}</p>
        <button type="button" onClick={() => setIsEditing(true)} className="mt-3 inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-sm font-medium text-forest cursor-pointer hover:underline">
          <Icon name="edit" size={15} /> Change address
        </button>
      </div>
    );
  }
  return (
    <AddressForm
      initial={address ?? undefined}
      showSaveOptions={false}
      submitLabel="Use This Address"
      onCancel={address ? () => setIsEditing(false) : undefined}
      onSave={(a) => {
        onSave(a);
        setIsEditing(false);
      }}
    />
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
  return (
    <div className="rounded-2xl border border-line bg-white">
      <EmptyState
        icon="check-circle"
        title="Order placed"
        description={`Thank you! Your order ${order.orderNumber} for ${formatPrice(order.total)} has been placed. Pay in cash when it is delivered.`}
        action={
          <div className="grid justify-items-center gap-3">
            {warning && <FormMessage tone="info">{warning}</FormMessage>}
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button href={`/account/orders/${order.orderNumber}`}>View Order</Button>
              <Button href="/shop" variant="outline">Continue Shopping</Button>
            </div>
          </div>
        }
      />
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
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authRequest]);

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
              onSave={(a) => {
                setAddress(a);
                attemptKey.current = null; // new details → new checkout attempt
                setError("");
              }}
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
