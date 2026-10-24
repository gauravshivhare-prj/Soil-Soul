"use client";

/**
 * OrderSummary — totals card shared by Cart and Checkout.
 * Shows the server's totals; shipping is shown as the amount the server charges.
 * (No free-shipping, tax or returns claims are made until the store owner approves those policies.)
 */

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
              <span className="text-[0.8125rem] font-medium text-ink">{formatPrice(l.lineTotal ?? l.unitPrice * l.qty)}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className={`m-0 grid gap-2 ${lines ? "mt-2 pt-3 border-t border-line" : "mt-4"}`}>
        <Row label={`Subtotal (${pluralize(totals.itemCount, "item")})`} value={formatPrice(totals.subtotal)} />
        {totals.discount > 0 && <Row label="Discount" value={`− ${formatPrice(totals.discount)}`} tone="[&_dd]:text-forest" />}
        <Row label="Shipping" value={formatPrice(totals.shipping)} />
      </dl>

      <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
        <span className={`${brandSerif.className} text-lg font-bold text-ink`}>Total</span>
        <span className={`${brandSerif.className} text-xl font-bold text-ink`}>{formatPrice(totals.total)}</span>
      </div>

      {children && <div className="mt-4 space-y-3">{children}</div>}
    </section>
  );
}
