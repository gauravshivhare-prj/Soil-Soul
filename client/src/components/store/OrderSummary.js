"use client";

/**
 * OrderSummary — cart totals card shared by Cart and Checkout.
 * FreeShippingProgress — "You are ₹X away from free shipping" meter.
 *
 * Totals are estimates from lib/pricing.js; the server recalculates
 * everything before a real order is created.
 */

import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { formatPrice, pluralize } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/data/commerce";
import { productHref } from "@/lib/routes";
import Icon from "@/components/ui/Icon";
import ProductImage from "@/components/ui/ProductImage";

export function FreeShippingProgress({ totals }) {
  if (totals.subtotal === 0) return null;
  const reached = totals.shipping === 0;
  const percent = Math.min(100, Math.round(((FREE_SHIPPING_THRESHOLD - totals.freeShippingRemaining) / FREE_SHIPPING_THRESHOLD) * 100));
  return (
    <div className="flex items-center gap-3 rounded-xl bg-sage-50 border border-line-sage p-3.5">
      <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-forest flex-shrink-0">
        <Icon name={reached ? "check-circle" : "leaf"} size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-xs sm:text-[0.8125rem] font-medium text-ink">
          {reached ? "You've unlocked free shipping!" : <>You are {formatPrice(totals.freeShippingRemaining)} away from free shipping!</>}
        </p>
        <div
          className="mt-2 h-1.5 rounded-full bg-white overflow-hidden"
          role="progressbar"
          aria-label="Progress towards free shipping"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={reached ? 100 : percent}
        >
          <div className="h-full rounded-full bg-forest transition-[width] duration-300" style={{ width: `${reached ? 100 : percent}%` }} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone = "" }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${tone}`}>
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-ink">{value}</dd>
    </div>
  );
}

export default function OrderSummary({ totals, coupon, lines, title = "Order Summary", headingLevel: H = "h2", children }) {
  return (
    <section aria-labelledby="order-summary-heading" className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
      <H id="order-summary-heading" className={`${brandSerif.className} m-0 text-[1.3rem] font-bold text-heading`}>
        {title}
      </H>

      {lines && (
        <ul className="list-none m-0 mt-4 p-0 divide-y divide-line">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-3 py-2.5">
              <ProductImage image={l.product.image} className="w-12 h-12 flex-shrink-0" rounded="rounded-lg" sizes="48px" />
              <div className="flex-1 min-w-0">
                <Link href={productHref(l.product.slug)} className="block truncate text-[0.8125rem] font-medium text-ink no-underline hover:text-forest">
                  {l.product.name}
                </Link>
                <p className="m-0 text-xs text-muted">
                  Qty: {l.qty}
                  {l.option && ` · ${l.option.name}`}
                </p>
              </div>
              <span className="text-[0.8125rem] font-medium text-ink">{formatPrice(l.unitPrice * l.qty)}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className={`m-0 grid gap-2 ${lines ? "mt-2 pt-3 border-t border-line" : "mt-4"}`}>
        <Row label={`Subtotal (${pluralize(totals.itemCount, "item")})`} value={formatPrice(totals.subtotal)} />
        {totals.discount > 0 && <Row label={`Discount (${coupon.code})`} value={`− ${formatPrice(totals.discount)}`} tone="[&_dd]:text-forest" />}
        <Row label="Shipping" value={totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)} />
        <Row label="Taxes" value="Included" />
      </dl>

      <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
        <span className={`${brandSerif.className} text-lg font-bold text-ink`}>Total</span>
        <span className={`${brandSerif.className} text-xl font-bold text-ink`}>{formatPrice(totals.total)}</span>
      </div>

      {children && <div className="mt-4 space-y-3">{children}</div>}
    </section>
  );
}
