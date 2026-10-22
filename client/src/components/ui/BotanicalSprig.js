/**
 * BotanicalSprig — decorative watercolour branch (Hero, Our Story,
 * Newsletter).
 *
 * Artwork: "Aka kohia" by Martha King (1842), public domain, via the
 * National Library of New Zealand / Wikimedia Commons. Paper background
 * removed to transparency; see public/images/botanical/.
 *
 * The image's stem starts bottom-left and the leaves reach up and right.
 * Position, size, rotation and mirroring come from `className` / `style`
 * on the wrapper so each section can place it independently. Purely
 * decorative: hidden from assistive tech and ignores pointer events.
 */

import Image from "next/image";

export const SPRIG_SRC = "/images/botanical/leafy-branch.png";
const SPRIG_RATIO = 681 / 1013; // width / height

export default function BotanicalSprig({ className = "", style, flip = false, rotate = 0, sizes = "320px" }) {
  const transform = `${flip ? "scaleX(-1) " : ""}rotate(${rotate}deg)`;
  return (
    <div
      className={`absolute pointer-events-none select-none ${className}`}
      style={{ aspectRatio: SPRIG_RATIO, transform, ...style }}
      aria-hidden="true"
    >
      <Image src={SPRIG_SRC} alt="" fill sizes={sizes} className="object-contain" draggable={false} />
    </div>
  );
}
