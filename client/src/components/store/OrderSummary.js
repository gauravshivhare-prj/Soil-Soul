"use client";

import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { formatPrice, pluralize } from "@/lib/format";
import { productHref } from "@/lib/routes";
import ProductImage from "@/components/ui/ProductImage";

function Row({ label, value, tone = "" }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${tone}`}>
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-ink">{value}</dd>
    </div>
  );
}

export default function OrderSummary({ totals, lines, title = "Order Summary", headingLevel: H = "h2", children }) {
  const subtotal = totals.subtotal || 0;
  const discount = totals.discount || 0;
  const taxable = Math.max(0, subtotal - discount);
  const shipping = totals.shipping ?? (subtotal >= 499 || subtotal === 0 ? 0 : 49);
  const tax = totals.tax ?? Math.round(taxable * 0.05 * 100) / 100;
  const total = subtotal === 0 ? 0 : Math.round((subtotal - discount + tax + shipping) * 100) / 100;
  const isFreeDelivery = shipping === 0 && subtotal > 0;
  const neededForFreeShipping = Math.max(0, 499 - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / 499) * 100));

  return (
    <section aria-labelledby="order-summary-heading" className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
      <H id="order-summary-heading" className={`${brandSerif.className} m-0 text-[1.3rem] font-bold text-heading`}>
        {title}
      </H>

      {/* Free Delivery Banner & Progress Bar */}
      {subtotal > 0 && (
        <div className="mt-3.5 p-3 rounded-xl border border-sage-200 bg-sage-50/70 text-xs space-y-1.5">
          {isFreeDelivery ? (
            <div className="flex items-center gap-2 font-semibold text-forest">
              <span>🎉</span>
              <span>You have qualified for <strong>FREE Delivery</strong> across India!</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between font-medium text-ink mb-1.5">
                <span>🚚 Add <strong>{formatPrice(neededForFreeShipping)}</strong> more for <strong>FREE Delivery</strong></span>
                <span className="text-[10px] font-bold text-forest">{progressPercent}%</span>
              </div>
              <div className="w-full bg-sand/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-forest h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

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
              <span className="text-[0.8125rem] font-medium text-ink">{formatPrice(l.lineTotal ?? l.unitPrice * l.qty)}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className={`m-0 grid gap-2 ${lines ? "mt-2 pt-3 border-t border-line" : "mt-4"}`}>
        <Row label={`Subtotal (${pluralize(totals.itemCount, "item")})`} value={formatPrice(subtotal)} />
        {discount > 0 && <Row label="Discount" value={`− ${formatPrice(discount)}`} tone="[&_dd]:text-forest font-semibold" />}
        <Row label="Estimated GST (5%)" value={formatPrice(tax)} />
        <Row
          label="Shipping Fee"
          value={shipping === 0 ? <span className="text-forest font-semibold">FREE (Order ₹499+)</span> : formatPrice(shipping)}
        />
      </dl>

      <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
        <span className={`${brandSerif.className} text-lg font-bold text-ink`}>Total</span>
        <span className={`${brandSerif.className} text-xl font-bold text-ink`}>
          {formatPrice(total)}
        </span>
      </div>

      {children && <div className="mt-4 space-y-3">{children}</div>}
    </section>
  );
}
