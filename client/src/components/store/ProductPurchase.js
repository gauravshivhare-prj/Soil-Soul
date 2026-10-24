"use client";

/**
 * ProductPurchase — option picker, quantity, Add to Cart / Buy Now and availability for the
 * product details page. Prices shown come from the API; the server re-checks price and stock
 * when the item is added and again at checkout. No delivery, tax or shipping promises are shown
 * until the store owner approves those policies.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, MAX_QTY_PER_LINE } from "@/features/cart/CartProvider";
import { useToast } from "@/components/ui/Toast";
import { defaultOptionId, isInStock } from "@/services/catalogApi";
import { formatPrice } from "@/lib/format";
import QuantitySelector from "@/components/ui/QuantitySelector";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Price from "@/components/ui/Price";
import { StatusBadge, stockStatus } from "@/components/ui/Badge";

export default function ProductPurchase({ product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { notify } = useToast();
  const [optionId, setOptionId] = useState(defaultOptionId(product));
  const [qty, setQty] = useState(1);
  const [isBusy, setIsBusy] = useState(false);

  const inStock = isInStock(product);
  const maxQty = Math.max(1, Math.min(MAX_QTY_PER_LINE, product.stock));
  const option = product.options?.choices.find((c) => c.id === optionId);
  const unitPrice = product.price + (option?.priceDelta ?? 0);
  const status = stockStatus(product.stock);

  async function add({ thenCheckout = false } = {}) {
    setIsBusy(true);
    const result = await addItem(product, { qty, optionId });
    setIsBusy(false);
    if (result.ok) {
      if (thenCheckout) router.push("/checkout");
      else notify(`${qty} × ${product.name} added to your cart`);
    } else if (result.error) {
      notify(result.error.message, { tone: "error" });
    }
  }

  return (
    <div>
      <Price price={unitPrice} mrp={product.mrp ? product.mrp + (option?.priceDelta ?? 0) : null} size="lg" />

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <StatusBadge status={status} label={status === "low-stock" ? `Only ${product.stock} left` : undefined} />
      </div>

      {product.options && (
        <fieldset className="m-0 mt-5 p-0 border-0">
          <legend className="mb-2.5 text-sm font-semibold text-ink">{product.options.label}</legend>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {product.options.choices.map((c) => {
              const selected = c.id === optionId;
              return (
                <label
                  key={c.id}
                  className={`relative flex flex-col rounded-xl border p-2.5 sm:p-3 cursor-pointer transition-colors
                              has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest
                              ${selected ? "border-forest bg-sage-50/60" : "border-line bg-white hover:border-sage-300"}`}
                >
                  <input type="radio" name="product-option" value={c.id} checked={selected} onChange={() => setOptionId(c.id)} className="sr-only" />
                  <span className="text-[0.8125rem] font-semibold text-ink">{c.name}</span>
                  {c.detail && <span className="text-[0.6875rem] text-muted">{c.detail}</span>}
                  <span className="mt-1.5 text-sm font-semibold text-ink">{formatPrice(product.price + (c.priceDelta ?? 0))}</span>
                  {selected && <span className="absolute top-2 right-2 text-forest"><Icon name="check-circle" size={16} /></span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-5 flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <p className="m-0 mb-2 text-sm font-semibold text-ink">Quantity</p>
          <QuantitySelector value={qty} onChange={setQty} max={maxQty} />
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2.5">
          <Button size="lg" disabled={!inStock || isBusy} onClick={() => add()}>
            <Icon name="cart" size={18} />
            {inStock ? "Add to Cart" : "Out of Stock"}
          </Button>
          <Button size="lg" variant="outline" disabled={!inStock || isBusy} onClick={() => add({ thenCheckout: true })}>
            <Icon name="bolt" size={17} />
            Buy Now
          </Button>
        </div>
      </div>

      {!inStock && (
        <p className="m-0 mt-3 text-sm text-muted">This item is currently out of stock. Please check back soon.</p>
      )}
    </div>
  );
}
