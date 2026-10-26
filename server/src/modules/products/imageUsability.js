import { imageSrc } from '../../utils/input.js';

/**
 * Whether a product has an image the shop can show. A product has NO usable image when its image
 * list is empty, none of its images has a valid source (https URL or /images/ path, the same rule
 * the admin API enforces), or every image is a verified placeholder.
 *
 * Placeholders are identified positively, never by host alone: the host is placehold.co AND the
 * alt text ends with "(placeholder image)" (as written by the catalogue content script). Images on
 * any other legitimate host are usable.
 */

export function isPlaceholderImage(img) {
  if (!img || typeof img.src !== 'string') return false;
  let host = '';
  try {
    host = new URL(img.src).hostname;
  } catch {
    return false;
  }
  return host === 'placehold.co' && typeof img.alt === 'string' && img.alt.trim().endsWith('(placeholder image)');
}

export function isUsableImage(img) {
  if (!img || typeof img.src !== 'string') return false;
  try {
    imageSrc(img.src);
  } catch {
    return false;
  }
  return !isPlaceholderImage(img);
}

export const hasUsableImage = (product) => Array.isArray(product?.images) && product.images.some(isUsableImage);

/**
 * MongoDB filter for "no usable image" (the same definition, expressed as a query):
 * no element whose source looks valid and that is not a verified placeholder.
 */
export const MISSING_IMAGE_FILTER = Object.freeze({
  images: {
    $not: {
      $elemMatch: {
        src: { $regex: '^(https://[^\\s/@]+[/?#]?|/images/)' },
        $nor: [{ src: { $regex: '^https://placehold\\.co[/?#]' }, alt: { $regex: '\\(placeholder image\\)\\s*$' } }],
      },
    },
  },
});
