/**
 * Line-art botanical leaf used for decorative sprigs (Our Story,
 * Newsletter, Footer). Render inside an <svg>.
 *
 * One leaf, base at (0,0), tip pointing up (-y), ~66 units long; position
 * it with x / y / rotate / scale. Colours default to the light sage
 * palette; pass `fill="none"` and light strokes for dark backgrounds.
 */
export function Leaf({
  x,
  y,
  rotate,
  scale = 1,
  fill = "#e4ebd8",
  stroke = "#9cb38b",
  veinStroke = "#a9bd99",
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path
        d="M0 0C-14-6-22-26-14-44C-9-54-2-60 4-66C6-56 14-46 16-32C18-16 10-4 0 0Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M0-1C2-20 2-40 4-63
           M1-12C-4-16-9-20-12-26 M1-12C6-15 10-18 13-22
           M2-26C-3-31-8-36-12-42 M2-26C7-29 11-33 15-36
           M3-40C-1-45-4-50-7-54 M3-40C7-43 10-47 12-50"
        stroke={veinStroke}
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </g>
  );
}
