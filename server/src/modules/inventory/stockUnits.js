/**
 * Stock units: the things that can actually run out. A product without variants is one unit;
 * a product with variants has one unit per variant.
 *
 * This mirrors checkout (see executeOrderPlacement): a variant whose own `stock` is set is sold
 * from that stock; a variant without its own stock is sold from the product-level stock (shared).
 */

/** Live = visible and purchasable in the shop (same rule as the storefront). */
export function isLiveProduct(product) {
  return Boolean(product.isActive) && !product.archivedAt && (product.status == null || product.status === 'active');
}

/**
 * @param {Object} product - Product document or lean object (needs stock, sku, options)
 * @returns {Array<{ optionId: string|null, optionName: string|null, sku: string|null, stock: number|null,
 *   ownStock: number|null, sharesProductStock: boolean, variantActive: boolean }>}
 *   `stock` is the effective sellable stock; `ownStock` is the variant's own stored value.
 */
export function stockUnits(product) {
  const choices = product.options?.choices ?? [];
  const baseStock = typeof product.stock === 'number' ? product.stock : null;
  if (choices.length === 0) {
    return [{ optionId: null, optionName: null, sku: product.sku ?? null, stock: baseStock, ownStock: baseStock, sharesProductStock: false, variantActive: true }];
  }
  return choices.map((choice) => {
    const own = typeof choice.stock === 'number' ? choice.stock : null;
    return {
      optionId: choice.id,
      optionName: choice.name ?? choice.id,
      sku: choice.sku ?? null,
      stock: own ?? baseStock,
      ownStock: own,
      sharesProductStock: own === null,
      variantActive: choice.isActive !== false,
    };
  });
}

/** Stock level of one unit: "out" (none or not set), "low" (≤ threshold) or "ok". */
export function stockLevel(unit, threshold) {
  if (unit.stock === null || unit.stock <= 0) return 'out';
  if (unit.stock <= threshold) return 'low';
  return 'ok';
}

/**
 * Counts for dashboard alerts: only units that are on sale (live product, active variant).
 * @returns {{ low: number, out: number }}
 */
export function countStockAlerts(products, threshold) {
  let low = 0;
  let out = 0;
  for (const product of products) {
    if (!isLiveProduct(product)) continue;
    for (const unit of stockUnits(product)) {
      if (!unit.variantActive) continue;
      const level = stockLevel(unit, threshold);
      if (level === 'out') out++;
      else if (level === 'low') low++;
    }
  }
  return { low, out };
}
