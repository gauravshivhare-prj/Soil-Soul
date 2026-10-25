/**
 * The product image to show for a line item: the one marked primary, else the first.
 * Returns the stored image entry unchanged (or null), so response shapes stay the same.
 */
export function primaryImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  return images.find((img) => img?.isPrimary) ?? images[0] ?? null;
}
