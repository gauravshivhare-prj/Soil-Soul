"use client";

/**
 * ProductPurchase — option picker, quantity, Add to Cart / Buy Now,
 * availability and a demo delivery check for the product details page.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, MAX_QTY_PER_LINE } from "@/features/cart/CartProvider";
import { useToast } from "@/components/ui/Toast";
import { defaultOptionId, isInStock } from "@/services/catalog";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/data/commerce";
import QuantitySelector from "@/components/ui/QuantitySelector";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Price from "@/components/ui/Price";
import { StatusBadge, stockStatus } from "@/components/ui/Badge";

function DeliveryCheck() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState(null);

  function check(e) {
    e.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      setResult({ ok: false, text: "Enter a valid 6-digit PIN code." });
      return;
    }
    // Demo only — real serviceability will come from the shipping partner.
    setResult({ ok: true, text: `Delivery to ${pincode} in 3–5 business days (estimate).` });
  }

  return (
    <form onSubmit={check} className="mt-5 rounded-xl border border-line bg-cream p-3.5">
      <label htmlFor="pincode" className="flex items-center gap-2 text-sm font-medium text-ink">
        <Icon name="truck" size={18} className="text-forest" />
        Check delivery
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="pincode"
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, ""));
            setResult(null);
          }}
          placeholder="Enter PIN code"
          aria-describedby="pincode-result"
          className="flex-1 min-w-0 h-10 rounded-lg border border-line bg-white px-3 text-base sm:text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
        />
        <Button type="submit" variant="outline">Check</Button>
      </div>
      <p id="pincode-result" aria-live="polite" className={`m-0 text-xs ${result ? "mt-2" : ""} ${result?.ok === false ? "text-danger" : "text-muted"}`}>
        {result?.text ?? ""}
      </p>
    </form>
  );
}

export default function ProductPurchase({ product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { notify } = useToast();
  const [optionId, setOptionId] = useState(defaultOptionId(product));
  const [qty, setQty] = useState(1);

  const inStock = isInStock(product);
  const maxQty = Math.max(1, Math.min(MAX_QTY_PER_LINE, product.stock));
  const option = product.options?.choices.find((c) => c.id === optionId);
  const unitPrice = product.price + (option?.priceDelta ?? 0);
  const status = stockStatus(product.stock);

  function add() {
    return addItem(product.slug, { qty, optionId });
  }

  return (
    <div>
      <Price price={unitPrice} mrp={product.mrp ? product.mrp + (option?.priceDelta ?? 0) : null} size="lg" />
      <p className="m-0 mt-1 text-xs text-muted">Inclusive of all taxes</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <StatusBadge status={status} label={status === "low-stock" ? `Only ${product.stock} left` : undefined} />
        {inStock && <span className="text-muted">Free shipping above {formatPrice(FREE_SHIPPING_THRESHOLD)}</span>}
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
                  <span className="text-[0.6875rem] text-muted">{c.detail}</span>
                  <span className="mt-1.5 text-sm font-semibold text-ink">{formatPrice(product.price + c.priceDelta)}</span>
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
          <Button
            size="lg"
            disabled={!inStock}
            onClick={() => add() && notify(`${qty} × ${product.name} added to your cart`)}
          >
            <Icon name="cart" size={18} />
            {inStock ? "Add to Cart" : "Out of Stock"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={!inStock}
            onClick={() => add() && router.push("/checkout")}
          >
            <Icon name="bolt" size={17} />
            Buy Now
          </Button>
        </div>
      </div>

      {!inStock && (
        <p className="m-0 mt-3 text-sm text-muted">This item is currently out of stock. Save it to your wishlist and check back soon.</p>
      )}

      <DeliveryCheck />
    </div>
  );
}
