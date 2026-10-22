/**
 * Fine-line botanical leaf for the footer's outline plant (dark
 * background). Render inside an <svg>; position with x / y / rotate /
 * scale. One leaf: base at (0,0), tip pointing up (-y), 70 units long.
 *
 * Other sections use the watercolour artwork in BotanicalSprig.
 */

/* Two ovate outlines with gently curved tips and slight asymmetry. */
const LEAF_SHAPES = [
  "M0 0C-15-7-26-27-21-46C-17-59-9-67 1-72C8-64 18-54 21-41C25-24 14-7 0 0Z",
  "M0 0C-17-9-25-30-18-48C-14-59-7-66 2-72C9-63 19-52 20-38C22-22 13-6 0 0Z",
];

/* Midrib curves a touch so the leaf doesn't look stamped. */
const MIDRIB = "M0-3C1-25 1.5-48 1-68";

/* Secondary veins: short curved arcs that stop before the edge. */
const VEINS =
  "M0-11C-4-14-8-18-11-23 M0-11C4-14 8-18 11-23 " +
  "M0-23C-4-27-9-31-13-36 M0-23C4-27 9-31 13-36 " +
  "M0-35C-3-39-7-43-10-48 M0-35C3-39 7-43 10-48 " +
  "M0.5-47C-2-51-5-54-7-58 M0.5-47C3-51 5-54 7-58";

export function Leaf({ x, y, rotate, scale = 1, flip, stroke = "rgba(244,241,232,0.55)" }) {
  // Alternate outline shape and mirroring by position so silhouettes vary.
  const seed = Math.round(x + y);
  const shape = LEAF_SHAPES[seed % 2];
  const mirrored = flip ?? seed % 3 === 0;
  const transform = `translate(${x} ${y}) rotate(${rotate}) scale(${mirrored ? -scale : scale} ${scale})`;

  return (
    <g transform={transform} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 6V0" strokeWidth="1" />
      <path d={shape} strokeWidth="1" />
      <path d={MIDRIB} strokeWidth="0.8" />
      <path d={VEINS} strokeWidth="0.6" opacity="0.75" />
    </g>
  );
}
