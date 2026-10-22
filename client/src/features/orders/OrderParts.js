/**
 * Order detail building blocks shared by Account › Order and Admin › Order:
 * OrderItems (lines table), OrderTotals and OrderTimeline (status steps).
 */

import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import Icon from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import { productHref } from "@/lib/routes";

export function OrderItems({ items, linkProducts = true }) {
  return (
    <ul className="list-none m-0 p-0 divide-y divide-line">
      {items.map((item) => (
        <li key={item.slug} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
          <ProductImage image={item.product.image} className="w-14 h-14 flex-shrink-0" rounded="rounded-lg" sizes="56px" />
          <div className="flex-1 min-w-0">
            {linkProducts ? (
              <Link href={productHref(item.slug)} className="text-sm font-semibold text-ink no-underline hover:text-forest">{item.product.name}</Link>
            ) : (
              <p className="m-0 text-sm font-semibold text-ink">{item.product.name}</p>
            )}
            <p className="m-0 mt-0.5 text-xs text-muted">{formatPrice(item.price)} × {item.qty}</p>
          </div>
          <span className="text-sm font-semibold text-ink">{formatPrice(item.price * item.qty)}</span>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ order }) {
  return (
    <dl className="m-0 grid gap-2 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="m-0 text-ink">{formatPrice(order.subtotal)}</dd></div>
      <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="m-0 text-ink">{order.shipping ? formatPrice(order.shipping) : "Free"}</dd></div>
      <div className="flex justify-between"><dt className="text-muted">Taxes</dt><dd className="m-0 text-ink">Included</dd></div>
      <div className="flex justify-between pt-2 mt-1 border-t border-line"><dt className="font-semibold text-ink">Total</dt><dd className="m-0 font-bold text-ink">{formatPrice(order.total)}</dd></div>
    </dl>
  );
}

const STEPS = [
  { id: "placed", label: "Order placed", icon: "check" },
  { id: "processing", label: "Processing", icon: "clock" },
  { id: "shipped", label: "Shipped", icon: "truck" },
  { id: "delivered", label: "Delivered", icon: "home" },
];
const REACHED = { processing: 1, shipped: 2, delivered: 3, cancelled: 0 };

export function OrderTimeline({ status }) {
  if (status === "cancelled") {
    return (
      <p className="m-0 flex items-center gap-2 rounded-xl bg-[#fdecea] px-4 py-3 text-sm text-danger">
        <Icon name="x-circle" size={18} /> This order was cancelled. Any payment made will be refunded to the original method.
      </p>
    );
  }
  const reached = REACHED[status] ?? 0;
  return (
    <ol className="list-none m-0 p-0 grid grid-cols-4" aria-label="Order progress">
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
