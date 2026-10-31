export function normalizeSearchQuery(query) {
  return typeof query === "string" ? query.trim().replace(/\s+/g, " ").toLowerCase() : "";
}

export function productSearchText(product) {
  const category = product?.category ?? {};
  return [
    product?.name,
    category.name,
    category.shortName,
    product?.summary,
    product?.categorySlug,
    product?.light,
    product?.size,
    ...(product?.tags ?? []),
    ...(product?.options?.choices ?? []).flatMap((choice) => [
      choice?.name,
      choice?.detail,
      ...Object.values(choice?.attributes ?? {}),
    ]),
  ].filter(Boolean).join(" ").toLowerCase();
}

export function matchesProductSearch(product, query) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  const haystack = productSearchText(product);
  return normalized.split(" ").every((word) => haystack.includes(word));
}
