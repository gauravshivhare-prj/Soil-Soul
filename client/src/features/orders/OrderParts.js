/**
 * Order detail building blocks shared by Account › Order and Admin › Order:
 * OrderItems (lines), OrderTotals, OrderTimeline (status steps) and DeliveryAddress.
 * They take orders as returned by the API (customer or admin view).
 */

import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import Icon from "@/components/ui/Icon";
import { formatDate, formatPrice } from "@/lib/format";
import { productHref } from "@/lib/routes";

export const PAYMENT_METHOD_LABEL = { COD: "Cash on Delivery" };

/** Lower-case status key used by StatusBadge ("PLACED" → "placed"). */
export const statusKey = (status) => String(status ?? "").toLowerCase();

/** Customers may cancel only before processing starts (mirrors the server rule). */
export const canCustomerCancel = (order) => ["PLACED", "CONFIRMED"].includes(order?.orderStatus);

const itemImage = (item) => (item.image?.src ? { src: item.image.src, alt: item.image.alt || item.name } : null);

export function OrderItems({ items, linkProducts = true }) {
  return (
    <ul className="list-none m-0 p-0 divide-y divide-line">
      {items.map((item, i) => (
        <li key={`${item.product}-${item.option?.id ?? ""}-${i}`} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
          <ProductImage image={itemImage(item)} className="w-14 h-14 flex-shrink-0" rounded="rounded-lg" sizes="56px" />
          <div className="flex-1 min-w-0">
            {linkProducts && item.slug ? (
              <Link href={productHref(item.slug)} className="text-sm font-semibold text-ink no-underline hover:text-forest">{item.name}</Link>
            ) : (
              <p className="m-0 text-sm font-semibold text-ink">{item.name}</p>
            )}
            {item.option?.name && <p className="m-0 mt-0.5 text-xs text-muted">{item.option.name}</p>}
            <p className="m-0 mt-0.5 text-xs text-muted">{formatPrice(item.unitPrice)} × {item.quantity}</p>
          </div>
          <span className="text-sm font-semibold text-ink">{formatPrice(item.lineTotal)}</span>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ order }) {
  return (
    <dl className="m-0 grid gap-2 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="m-0 text-ink">{formatPrice(order.subtotal)}</dd></div>
      {order.discount > 0 && (
        <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="m-0 text-ink">−{formatPrice(order.discount)}</dd></div>
      )}
      <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="m-0 text-ink">{formatPrice(order.shippingFee ?? 0)}</dd></div>
      <div className="flex justify-between pt-2 mt-1 border-t border-line"><dt className="font-semibold text-ink">Total</dt><dd className="m-0 font-bold text-ink">{formatPrice(order.total)}</dd></div>
      {order.totalRefunded > 0 && (
        <div className="flex justify-between"><dt className="text-muted">Refunded</dt><dd className="m-0 text-ink">{formatPrice(order.totalRefunded)}</dd></div>
      )}
    </dl>
  );
}

export function DeliveryAddress({ address }) {
  if (!address) return null;
  const lines = [address.addressLine1, address.addressLine2, address.city, `${address.state} ${address.postalCode}`].filter(Boolean).join(", ");
  return (
    <>
      <p className="m-0 text-sm font-semibold text-ink">{address.recipientName}</p>
      <p className="m-0 mt-0.5 text-sm text-muted">{lines}</p>
      <p className="m-0 mt-0.5 text-sm text-muted">{address.phone}</p>
    </>
  );
}

const STEPS = [
  { id: "PLACED", label: "Placed", icon: "check" },
  { id: "CONFIRMED", label: "Confirmed", icon: "check-circle" },
  { id: "PROCESSING", label: "Processing", icon: "clock" },
  { id: "SHIPPED", label: "Shipped", icon: "truck" },
  { id: "DELIVERED", label: "Delivered", icon: "home" },
];

export function OrderTimeline({ status }) {
  if (status === "CANCELLED") {
    return (
      <p className="m-0 flex items-center gap-2 rounded-xl bg-[#fdecea] px-4 py-3 text-sm text-danger">
        <Icon name="x-circle" size={18} /> This order was cancelled.
      </p>
    );
  }
  const reached = Math.max(0, STEPS.findIndex((s) => s.id === status));
  return (
    <ol className="list-none m-0 p-0 grid grid-cols-5" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const done = i <= reached;
        return (
          <li key={s.id} className="relative flex flex-col items-center text-center" aria-current={i === reached ? "step" : undefined}>
            {i > 0 && <span className={`absolute top-4 right-1/2 w-full h-0.5 ${i <= reached ? "bg-forest" : "bg-line"}`} aria-hidden="true" />}
            <span className={`relative flex items-center justify-center w-8 h-8 rounded-full ${done ? "bg-forest text-cream" : "bg-sand text-faint"}`}>
              <Icon name={s.icon} size={15} strokeWidth={2} />
            </span>
            <span className={`mt-1.5 text-[0.6875rem] sm:text-xs ${done ? "text-ink font-medium" : "text-muted"}`}>
              {s.label}
              <span className="sr-only">{done ? " (complete)" : " (pending)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderStatusHistory({ history = [] }) {
  if (!history.length) return null;
  return (
    <ol aria-label="Order status history" className="m-0 mt-4 grid list-none gap-2 border-t border-line pt-4">
      {history.map((entry, index) => (
        <li key={`${entry.changedAt}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-ink">{entry.previousStatus ? `${labelStatus(entry.previousStatus)} → ` : ""}{labelStatus(entry.nextStatus)}</span>
          <time className="text-xs text-muted" dateTime={entry.changedAt}>{formatDate(entry.changedAt)}</time>
          {entry.reason && <span className="basis-full text-xs text-muted">{entry.reason}</span>}
        </li>
      ))}
    </ol>
  );
}

function labelStatus(status) {
  return String(status ?? "").toLowerCase().replace(/(^|_)([a-z])/g, (_, space, letter) => `${space ? " " : ""}${letter.toUpperCase()}`);
}
