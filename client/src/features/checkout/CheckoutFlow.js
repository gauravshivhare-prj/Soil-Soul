"use client";

/**
 * CheckoutFlow — Address → Payment → Review, then a demo confirmation.
 *
 * UI ONLY: no payment request is made, no payment details are collected,
 * and no real order is created. "Place Order" shows a clearly labelled
 * demo confirmation and clears the local cart. Real checkout must create
 * the order and verify payment on the server.
 */

import { useRef, useState } from "react";
import { brandSerif } from "@/app/fonts";
import { useCart } from "@/features/cart/CartProvider";
import { getAddresses } from "@/services/account";
import { PAYMENT_OPTIONS } from "@/data/commerce";
import { formatAddress, formatPrice } from "@/lib/format";
import AddressForm from "@/components/store/AddressForm";
import OrderSummary from "@/components/store/OrderSummary";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { Checkbox } from "@/components/ui/Field";
import { DemoNotice, EmptyState, Skeleton } from "@/components/ui/States";

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
function AddressStep({ addresses, selectedId, onSelect, onAdd }) {
  const [mode, setMode] = useState(addresses.length ? "saved" : "new");
  return (
    <>
      <div role="tablist" aria-label="Address source" className="grid grid-cols-2 gap-1 rounded-xl bg-sand p-1 mb-4">
        {[["saved", "Saved Addresses"], ["new", "Add New Address"]].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`h-10 rounded-lg border-0 text-sm font-medium cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest
                        ${mode === id ? "bg-forest text-cream" : "bg-transparent text-ink hover:bg-white/60"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "saved" ? (
        <fieldset className="m-0 p-0 border-0 grid gap-3">
          <legend className="sr-only">Choose a delivery address</legend>
          {addresses.map((a) => (
            <label
              key={a.id}
              className={`flex gap-3 rounded-xl border p-4 cursor-pointer transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest
                          ${selectedId === a.id ? "border-forest bg-sage-50/50" : "border-line hover:border-sage-300"}`}
            >
              <input type="radio" name="address" checked={selectedId === a.id} onChange={() => onSelect(a.id)} className="mt-1 w-4 h-4 accent-forest" />
              <span className="flex-1 min-w-0 text-sm">
                <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                  {a.name}
                  <span className="rounded-full bg-sand px-2 py-0.5 text-[0.6875rem] font-medium text-muted">{a.label}</span>
                  {a.isDefault && <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[0.6875rem] font-medium text-[#3d5a35]">Default</span>}
                </span>
                <span className="block mt-1 text-muted">{formatAddress(a)}</span>
                <span className="block mt-0.5 text-muted">{a.phone}</span>
              </span>
            </label>
          ))}
          <button type="button" onClick={() => setMode("new")} className="justify-self-start inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-sm font-medium text-forest cursor-pointer hover:underline">
            <Icon name="plus" size={16} /> Add a new address
          </button>
        </fieldset>
      ) : (
        <AddressForm
          submitLabel="Save & Use This Address"
          onCancel={addresses.length ? () => setMode("saved") : undefined}
          onSave={(address) => {
            onAdd(address);
            setMode("saved");
          }}
        />
      )}
    </>
  );
}

function PaymentStep({ selected, onSelect }) {
  return (
    <fieldset className="m-0 p-0 border-0 grid gap-3">
      <legend className="sr-only">Choose a payment method</legend>
      {PAYMENT_OPTIONS.map((o) => (
        <label
          key={o.id}
          className={`flex items-center gap-3.5 rounded-xl border p-4 cursor-pointer transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest
                      ${selected === o.id ? "border-forest bg-sage-50/50" : "border-line hover:border-sage-300"}`}
        >
          <input type="radio" name="payment" checked={selected === o.id} onChange={() => onSelect(o.id)} className="w-4 h-4 accent-forest" />
          <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-sand text-forest flex-shrink-0">
            {o.icon === "upi" ? <span className="text-[0.8125rem] font-black italic tracking-tight">UPI</span> : <Icon name={o.icon} size={22} />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-ink">{o.name}</span>
            <span className="block text-xs text-muted">{o.detail}</span>
          </span>
        </label>
      ))}
      <DemoNotice>
        Payments aren&rsquo;t connected yet. No card, UPI or bank details are collected and no money is charged in this demo.
      </DemoNotice>
    </fieldset>
  );
}

function ReviewStep({ address, payment, lines, agreed, onAgree, error }) {
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
          <p className="m-0 mt-0.5 text-sm text-muted">{payment.detail}</p>
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
            <span className="font-medium text-ink">{formatPrice(l.unitPrice * l.qty)}</span>
          </li>
        ))}
      </ul>
      <div>
        <Checkbox label="I agree to the Terms & Conditions and Privacy Policy" checked={agreed} onChange={(e) => onAgree(e.target.checked)} />
        {error && <p className="m-0 mt-1.5 text-xs text-danger" role="alert">{error}</p>}
      </div>
    </div>
  );
}

function Confirmation({ order }) {
  return (
    <div className="rounded-2xl border border-line bg-white">
      <EmptyState
        icon="check-circle"
        title="Order placed (demo)"
        description={`Thank you! This was a demonstration checkout — no payment was taken and no real order was created. Reference: ${order.id}. Total ${formatPrice(order.total)}.`}
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button href="/shop">Continue Shopping</Button>
            <Button href="/account/orders" variant="outline">View My Orders</Button>
          </div>
        }
      />
    </div>
  );
}

/* ─── Flow ─────────────────────────────────────────────────────── */
export default function CheckoutFlow() {
  const { isReady, lines, totals, coupon, clearCart } = useCart();
  const [addresses, setAddresses] = useState(() => getAddresses());
  const [addressId, setAddressId] = useState(() => (getAddresses().find((a) => a.isDefault) ?? getAddresses()[0])?.id ?? null);
  const [paymentId, setPaymentId] = useState("cod");
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const headingRef = useRef(null);

  function goTo(next) {
    setError("");
    setStep(next);
    // Move focus to the new step heading after it renders.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  if (placedOrder) return <Confirmation order={placedOrder} />;

  if (!isReady) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]" role="status" aria-label="Loading checkout">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
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

  const address = addresses.find((a) => a.id === addressId);
  const payment = PAYMENT_OPTIONS.find((p) => p.id === paymentId);

  function next() {
    if (step === 0 && !address) return setError("Please choose or add a delivery address.");
    if (step === 1 && !payment) return setError("Please choose a payment method.");
    goTo(step + 1);
  }

  function placeOrder() {
    if (!agreed) return setError("Please accept the terms to place your order.");
    setIsPlacing(true);
    // Simulated processing delay — no network request is made.
    setTimeout(() => {
      setPlacedOrder({ id: `DEMO-${String(Date.now()).slice(-6)}`, total: totals.total });
      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 900);
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
              addresses={addresses}
              selectedId={addressId}
              onSelect={setAddressId}
              onAdd={(a) => {
                setAddresses((list) => [...list.map((x) => (a.isDefault ? { ...x, isDefault: false } : x)), a]);
                setAddressId(a.id);
                setError("");
              }}
            />
          </Panel>
        )}
        {step === 1 && (
          <Panel title="2. Payment Method" icon="card" headingRef={headingRef}>
            <PaymentStep selected={paymentId} onSelect={setPaymentId} />
          </Panel>
        )}
        {step === 2 && (
          <Panel title="3. Review Order" icon="bag" headingRef={headingRef}>
            <ReviewStep address={address} payment={payment} lines={lines} agreed={agreed} onAgree={(v) => { setAgreed(v); setError(""); }} error={error} />
          </Panel>
        )}

        {error && step < 2 && <p className="m-0 text-sm text-danger" role="alert">{error}</p>}

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
              {isPlacing ? "Placing order…" : `Place Order (Demo) · ${formatPrice(totals.total)}`}
            </Button>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-28 space-y-3">
        <OrderSummary totals={totals} coupon={coupon} lines={lines} />
        <p className="m-0 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Icon name="lock" size={13} /> Demo checkout — no payment is processed
        </p>
      </div>
    </div>
  );
}
