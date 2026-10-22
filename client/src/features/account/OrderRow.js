/**
 * OrderRow — one order in Account lists: thumbnail, first item, status,
 * total and a View Details link.
 */

import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatPrice, pluralize } from "@/lib/format";
import { accountOrderHref } from "@/lib/routes";

export default function OrderRow({ order }) {
  const first = order.items[0];
  const more = order.items.length - 1;
  return (
    <li className="grid grid-cols-[64px_1fr] sm:grid-cols-[72px_1fr_auto_auto_auto] items-center gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0">
      <ProductImage image={first.product.image} className="w-16 h-16 sm:w-[72px] sm:h-[72px] row-span-2 sm:row-span-1" rounded="rounded-lg" sizes="72px" />
      <div className="min-w-0">
        <p className="m-0 text-sm font-semibold text-ink truncate">
          {first.product.name}
          {more > 0 && <span className="font-normal text-muted"> + {more} more</span>}
        </p>
        <p className="m-0 mt-0.5 text-xs text-muted">{pluralize(order.itemCount, "item")}</p>
        <p className="m-0 mt-0.5 text-xs text-muted">Order #{order.id} · {formatDate(order.date)}</p>
      </div>
      <div className="col-start-2 sm:col-start-auto flex items-center gap-3 sm:contents">
        <StatusBadge status={order.status} />
        <span className="text-sm font-semibold text-ink sm:w-20 sm:text-right">{formatPrice(order.total)}</span>
        <Link
          href={accountOrderHref(order.id)}
          className="ml-auto sm:ml-0 inline-flex items-center h-9 px-3.5 rounded-lg border border-line bg-white text-xs font-medium text-ink no-underline whitespace-nowrap hover:border-forest/50
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          View Details<span className="sr-only"> for order {order.id}</span>
        </Link>
      </div>
    </li>
  );
}
