"use client";

/**
 * CartView — cart lines, coupon form and order summary.
 * Quantity changes and removals update totals immediately (cart store).
 */

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/features/cart/CartProvider";
import { useToast } from "@/components/ui/Toast";
import { formatPrice } from "@/lib/format";
import { productHref } from "@/lib/routes";
import ProductImage from "@/components/ui/ProductImage";
import QuantitySelector from "@/components/ui/QuantitySelector";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { EmptyState, Skeleton } from "@/components/ui/States";
import OrderSummary, { FreeShippingProgress } from "./OrderSummary";

const PROMISES = [
  { icon: "truck", text: "Secure & Fast Delivery" },
  { icon: "shield", text: "Easy Returns" },
  { icon: "sprout", text: "Sustainable Packaging" },
];

function CouponForm() {
  const { coupon, totals, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    const result = applyCoupon(code);
    if (result.ok) {
      setCode("");
      setError("");
    } else {
      setError(result.error);
    }
  }

  if (coupon) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-sage bg-sage-50 px-4 py-3">
        <p className="m-0 flex items-center gap-2 text-sm text-ink">
          <Icon name="tag" size={18} className="text-forest" />
          <span>
            <strong className="font-semibold">{coupon.code}</strong> applied — {coupon.description}
            {!totals.couponValid && <span className="block text-xs text-danger">Add more items to meet this coupon&rsquo;s minimum.</span>}
          </span>
        </p>
        <button type="button" onClick={removeCoupon} className="text-sm font-medium text-forest underline underline-offset-2 bg-transparent border-0 cursor-pointer">
          Remove
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line-sage bg-sage-50 px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="coupon" className="flex items-center gap-2 text-sm font-medium text-ink sm:flex-1">
          <Icon name="tag" size={18} className="text-forest" />
          Have a coupon code?
        </label>
        <div className="flex gap-2 sm:w-[360px]">
          <input
            id="coupon"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            placeholder="Enter coupon code"
            aria-invalid={error ? true : undefined}
            aria-describedby="coupon-msg"
            className="flex-1 min-w-0 h-10 rounded-lg border border-line bg-white px-3 text-base sm:text-sm uppercase placeholder:normal-case outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
          />
          <Button type="submit">Apply</Button>
        </div>
      </div>
      <p id="coupon-msg" aria-live="polite" className={`m-0 text-xs ${error ? "mt-2 text-danger" : "mt-2 text-muted"}`}>
        {error || "Try GREEN10, WELCOME50 or FREESHIP (demo codes)."}
      </p>
    </form>
  );
}

function CartLine({ line }) {
  const { setQty, removeItem } = useCart();
  const { notify } = useToast();
  const { product } = line;
  return (
    <li className="grid grid-cols-[72px_1fr] sm:grid-cols-[88px_1fr] md:grid-cols-[minmax(0,2.2fr)_1fr_1.2fr_1fr_40px] gap-x-4 gap-y-3 items-center px-4 sm:px-5 py-4">
      <div className="contents md:flex md:items-center md:gap-4 md:min-w-0">
        <Link href={productHref(product.slug)} tabIndex={-1} aria-hidden="true" className="flex-shrink-0">
          <ProductImage image={product.image} className="w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] md:w-20 md:h-20" rounded="rounded-lg" sizes="88px" />
        </Link>
        <div className="min-w-0">
          <Link href={productHref(product.slug)} className="text-sm sm:text-[0.9375rem] font-semibold text-ink no-underline hover:text-forest">
            {product.name}
          </Link>
          <p className="m-0 mt-0.5 text-xs text-muted">
            {product.category.shortName}
            {line.option && ` · ${line.option.name}`}
          </p>
          <p className="m-0 mt-1 flex items-center gap-1 text-xs text-forest">
            <span className="w-1.5 h-1.5 rounded-full bg-forest" aria-hidden="true" />
            {product.stock > 0 ? "In Stock" : "Out of Stock"}
          </p>
          <p className="m-0 mt-1 text-sm text-ink md:hidden">{formatPrice(line.unitPrice)}</p>
        </div>
      </div>

      <p className="m-0 hidden md:block text-sm font-medium text-ink">{formatPrice(line.unitPrice)}</p>

      <div className="col-start-2 md:col-start-auto flex items-center justify-between md:justify-start gap-3">
        <QuantitySelector
          value={line.qty}
          max={line.maxQty}
          onChange={(q) => setQty(line.key, q)}
          label={`Quantity for ${product.name}`}
          size="sm"
        />
        <span className="md:hidden text-sm font-semibold text-ink">{formatPrice(line.unitPrice * line.qty)}</span>
      </div>

      <p className="m-0 hidden md:block text-sm font-semibold text-ink">{formatPrice(line.unitPrice * line.qty)}</p>

      <button
        type="button"
        onClick={() => {
          removeItem(line.key);
          notify(`${product.name} removed from your cart`);
        }}
        aria-label={`Remove ${product.name} from cart`}
        className="col-start-2 md:col-start-auto justify-self-start md:justify-self-end inline-flex items-center gap-1.5 md:w-9 md:h-9 md:justify-center rounded-lg
                   bg-transparent border-0 text-xs text-muted cursor-pointer hover:text-danger md:hover:bg-[#fdecea]
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
      >
        <Icon name="trash" size={17} />
        <span className="md:hidden">Remove</span>
      </button>
    </li>
  );
}

export default function CartView() {
  const { isReady, lines, totals, coupon } = useCart();

  if (!isReady) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]" role="status" aria-label="Loading cart">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white">
        <EmptyState
          icon="cart"
          title="Your cart is empty"
          description="Looks like you haven't added anything yet. Explore plants, pots and natural care essentials."
          action={
            <Button href="/shop" size="lg">
              Start Shopping <Icon name="arrow-right" size={17} />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] items-start">
      <div className="min-w-0 space-y-4">
        <section aria-label="Cart items" className="rounded-2xl border border-line bg-white overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[minmax(0,2.2fr)_1fr_1.2fr_1fr_40px] gap-x-4 px-5 py-3 border-b border-line text-xs font-semibold text-ink" aria-hidden="true">
            <span>Product</span>
            <span>Price</span>
            <span>Quantity</span>
            <span>Total</span>
            <span />
          </div>
          <ul className="list-none m-0 p-0 divide-y divide-line">
            {lines.map((l) => <CartLine key={l.key} line={l} />)}
          </ul>
        </section>
        <CouponForm />
      </div>

      <div className="space-y-4 lg:sticky lg:top-28">
        <OrderSummary totals={totals} coupon={coupon}>
          <Button href="/checkout" size="lg" block>
            Proceed to Checkout <Icon name="arrow-right" size={17} />
          </Button>
          <FreeShippingProgress totals={totals} />
          <ul className="list-none m-0 p-0 grid grid-cols-3 gap-2 pt-1">
            {PROMISES.map((p) => (
              <li key={p.text} className="flex flex-col items-center text-center gap-1.5 text-[0.6875rem] text-muted">
                <Icon name={p.icon} size={20} className="text-forest" />
                {p.text}
              </li>
            ))}
          </ul>
        </OrderSummary>
      </div>
    </div>
  );
}
