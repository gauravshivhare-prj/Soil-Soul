/**
 * Botanical leaf artwork for decorative sprigs (Hero, Our Story,
 * Newsletter, Footer).
 *
 * Usage inside an <svg>:
 *   <LeafDefs id="hero" />                      — once per <svg>
 *   <g filter={leafShadow("hero")}>              — optional soft shadow
 *     <Leaf ids="hero" x={..} y={..} rotate={..} scale={..} />
 *   </g>
 *
 * One leaf: base at (0,0), tip pointing up (-y), 70 units long. The
 * "paint" variant layers a gradient, watercolour mottling, roughened
 * edges and curved veins; the "line" variant is a light outline for dark
 * backgrounds (footer).
 *
 * `ids` must be unique per <svg> on the page so filter/gradient ids
 * don't collide.
 */

/* Slightly asymmetric ovate leaf with a pointed, gently curved tip. */
const LEAF_PATH =
  "M0 0C-15-7-26-27-21-46C-17-59-9-67 1-72C8-64 18-54 21-41C25-24 14-7 0 0Z";

/* Midrib curves a touch so the leaf doesn't look stamped. */
const MIDRIB = "M0-3C1-25 1.5-48 1-68";

/* Secondary veins: curved arcs from the midrib towards the edge. */
const VEINS =
  "M0-11C-4-14-8-18-11-23 M0-11C4-14 8-18 11-23 " +
  "M0-23C-4-27-9-31-13-36 M0-23C4-27 9-31 13-36 " +
  "M0-35C-3-39-7-43-10-48 M0-35C3-39 7-43 10-48 " +
  "M0.5-47C-2-51-5-54-7-58 M0.5-47C3-51 5-54 7-58";

export function leafShadow(ids) {
  return `url(#${ids}-shadow)`;
}

export function LeafDefs({ id }) {
  return (
    <defs>
      {/* Base colour: lighter at the tip, deeper at the base */}
      <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="-72" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#b9cba2" />
        <stop offset="0.55" stopColor="#cddbb7" />
        <stop offset="1" stopColor="#dfe8d0" />
      </linearGradient>
      {/* Lighter variant for leaves further back */}
      <linearGradient id={`${id}-grad-light`} x1="0" y1="0" x2="0" y2="-72" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#cad9b6" />
        <stop offset="0.55" stopColor="#dbe5c9" />
        <stop offset="1" stopColor="#e8eedc" />
      </linearGradient>
      {/* Soft darkening towards the base and edges */}
      <radialGradient id={`${id}-shade`} cx="0" cy="-32" r="42" gradientUnits="userSpaceOnUse">
        <stop offset="0.45" stopColor="#5f7a52" stopOpacity="0" />
        <stop offset="1" stopColor="#5f7a52" stopOpacity="0.28" />
      </radialGradient>
      {/* Gently roughen the painted edge */}
      <filter id={`${id}-edge`} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      {/* Watercolour mottling, kept inside the leaf shape */}
      <filter id={`${id}-texture`} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="3" result="noise" />
        <feColorMatrix in="noise" type="saturate" values="0" result="grey" />
        <feComposite in="grey" in2="SourceGraphic" operator="in" />
      </filter>
      {/* Blur for the pooled darker edge */}
      <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
      <clipPath id={`${id}-clip`} clipPathUnits="userSpaceOnUse">
        <path d={LEAF_PATH} />
      </clipPath>
      {/* Lift overlapping leaves off each other */}
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#4a5e3f" floodOpacity="0.2" />
      </filter>
    </defs>
  );
}

export function Leaf({
  ids,
  x,
  y,
  rotate,
  scale = 1,
  flip,
  light = false,
  variant = "paint",
  stroke = "rgba(244,241,232,0.6)",
}) {
  // Mirror alternate leaves (by position) so silhouettes vary.
  const mirrored = flip ?? Math.round(x + y) % 2 === 0;
  const transform = `translate(${x} ${y}) rotate(${rotate}) scale(${mirrored ? -scale : scale} ${scale})`;

  if (variant === "line") {
    return (
      <g transform={transform} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 6V0" strokeWidth="1.2" />
        <path d={LEAF_PATH} strokeWidth="1.1" />
        <path d={MIDRIB} strokeWidth="0.9" />
        <path d={VEINS} strokeWidth="0.7" opacity="0.8" />
      </g>
    );
  }

  return (
    <g transform={transform}>
      {/* Petiole */}
      <path d="M0 7C0 4 0 2 0 0" stroke="#8da37a" strokeWidth="1.4" strokeLinecap="round" fill="none" />

      {/* Painted body */}
      <g filter={`url(#${ids}-edge)`}>
        <path d={LEAF_PATH} fill={`url(#${ids}-grad${light ? "-light" : ""})`} />
        <path d={LEAF_PATH} fill={`url(#${ids}-shade)`} />
        <path d={LEAF_PATH} fill="#3f5a36" opacity="0.1" filter={`url(#${ids}-texture)`} />
      </g>

      {/* Darker pigment pooling at the edge */}
      <g clipPath={`url(#${ids}-clip)`}>
        <path
          d={LEAF_PATH}
          fill="none"
          stroke="#7d9769"
          strokeWidth="3"
          opacity="0.4"
          filter={`url(#${ids}-blur)`}
        />
      </g>

      {/* Veins */}
      <path d={VEINS} fill="none" stroke="#7f9a6c" strokeWidth="0.6" strokeLinecap="round" opacity="0.55" />
      <path d={MIDRIB} fill="none" stroke="#7d9769" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

/* Branch stem: a soft double stroke so it reads as a rounded stalk. */
export function Stem({ d, width = 2 }) {
  return (
    <>
      <path d={d} fill="none" stroke="#7f9a6c" strokeWidth={width} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#b7c9a3" strokeWidth={width * 0.45} strokeLinecap="round" opacity="0.8" />
    </>
  );
}
