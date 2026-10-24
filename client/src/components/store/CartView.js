"use client";

/**
 * CartView — server cart lines and order summary.
 * Quantities and removals are saved to the server; prices, stock and totals shown are the
 * server's. Lines the server marks unavailable are flagged and must be fixed before checkout.
 */

import Link from "next/link";
import { useCart } from "@/features/cart/CartProvider";
import { useToast } from "@/components/ui/Toast";
import { formatPrice } from "@/lib/format";
import { productHref } from "@/lib/routes";
import ProductImage from "@/components/ui/ProductImage";
import QuantitySelector from "@/components/ui/QuantitySelector";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import OrderSummary from "./OrderSummary";

function CartLine({ line }) {
  const { setQty, removeItem } = useCart();
  const { notify } = useToast();
  const { product } = line;

  async function changeQty(q) {
    const result = await setQty(line.key, q);
    if (!result.ok) notify(result.error?.message ?? "Couldn't update the quantity.", { tone: "error" });
  }

  async function remove() {
    const result = await removeItem(line.key);
    notify(result.ok ? `${product.name} removed from your cart` : result.error?.message ?? "Couldn't remove the item.", result.ok ? {} : { tone: "error" });
  }

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
          {line.option && <p className="m-0 mt-0.5 text-xs text-muted">{line.option.name}</p>}
          {line.isAvailable ? (
            <p className="m-0 mt-1 flex items-center gap-1 text-xs text-forest">
              <span className="w-1.5 h-1.5 rounded-full bg-forest" aria-hidden="true" />
              In Stock
            </p>
          ) : (
            <p className="m-0 mt-1 text-xs font-medium text-danger" role="status">{line.availabilityReason ?? "Unavailable"}</p>
          )}
          <p className="m-0 mt-1 text-sm text-ink md:hidden">{formatPrice(line.unitPrice)}</p>
        </div>
      </div>

      <p className="m-0 hidden md:block text-sm font-medium text-ink">{formatPrice(line.unitPrice)}</p>

      <div className="col-start-2 md:col-start-auto flex items-center justify-between md:justify-start gap-3">
        <QuantitySelector value={line.qty} max={line.maxQty} onChange={changeQty} label={`Quantity for ${product.name}`} size="sm" />
        <span className="md:hidden text-sm font-semibold text-ink">{formatPrice(line.lineTotal)}</span>
      </div>

      <p className="m-0 hidden md:block text-sm font-semibold text-ink">{formatPrice(line.lineTotal)}</p>

      <button
        type="button"
        onClick={remove}
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
  const { isReady, isAuthenticated, lines, totals, error } = useCart();

  if (!isReady) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]" role="status" aria-label="Loading cart">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-line bg-white">
        <EmptyState
          icon="cart"
          title="Sign in to see your cart"
          description="Your cart is saved to your account, so it follows you across devices."
          action={<Button href="/login?next=/cart" size="lg">Sign In <Icon name="arrow-right" size={17} /></Button>}
        />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white">
        {error && <FormMessage tone="error" className="m-4">{error.message}</FormMessage>}
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
        {error && <FormMessage tone="error">{error.message}</FormMessage>}
        {totals.hasUnavailable && (
          <FormMessage tone="error">Some items are unavailable or exceed the available stock. Update or remove them before checkout.</FormMessage>
        )}
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
      </div>

      <div className="space-y-4 lg:sticky lg:top-28">
        <OrderSummary totals={totals}>
          {totals.hasUnavailable ? (
            <Button size="lg" block disabled>Fix cart to continue</Button>
          ) : (
            <Button href="/checkout" size="lg" block>
              Proceed to Checkout <Icon name="arrow-right" size={17} />
            </Button>
          )}
        </OrderSummary>
      </div>
    </div>
  );
}
