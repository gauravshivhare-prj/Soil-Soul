/**
 * ProductImage — product/lifestyle image slot.
 *
 * Product photos aren't connected yet, so when `image` is null this renders
 * an intentional warm-cream surface at the same aspect ratio. Once photos
 * exist under public/images/, pass `image={{ src, alt }}` and the same slot
 * renders a Next.js <Image> with no layout change.
 *
 * Size the slot with `className` (e.g. "aspect-square", "h-24 w-24").
 */

import Image from "next/image";

export default function ProductImage({ image, sizes = "(min-width: 1024px) 25vw, 50vw", className = "", rounded = "", children, priority = false }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-b from-[#f6f2e9] to-[#efe9dc] ${rounded} ${className}`}>
      {image?.src && (
        // Remote (admin-entered https) images are not run through the optimizer, so no host
        // allowlist is needed; local /images/ files are optimized as before.
        <Image src={image.src} alt={image.alt ?? ""} fill sizes={sizes} preload={priority} unoptimized={/^https:\/\//.test(image.src)} className="object-cover" />
      )}
      {children}
    </div>
  );
}
