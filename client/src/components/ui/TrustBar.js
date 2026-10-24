/**
 * TrustBar — four brand promises shown under the hero.
 *
 * Server Component. Layout:
 *   below sm — 2 × 2 card grid, icon stacked above centred text.
 *   sm–lg    — 2 × 2 card grid, icon beside text.
 *   lg+      — single row of four with short vertical dividers.
 */

/* ─── Icons (stroke inherits the circle's text colour) ──────────── */
function Svg({ children }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function LeafIcon() {
  return (
    <Svg>
      <path d="M6 26C6 26 4 14 12 8C18 4 26 5 26 5C26 5 28 17 20 23C14 27 6 26 6 26Z" />
      <path d="M6 26C12 20 18 14 26 5" />
      <path d="M12 21C14 18 14 15 13 12" />
      <path d="M18 16C20 14 20 11 19 8" />
    </Svg>
  );
}

function SproutIcon() {
  return (
    <Svg>
      <path d="M16 28V13" />
      <path d="M16 13C16 9 13 5 8 5C8 9 11 13 16 13Z" />
      <path d="M16 13C16 9 19 5 24 5C24 9 21 13 16 13Z" />
      <path d="M16 21C16 18 13.5 15.5 9.5 15.5C9.5 18.5 12 21 16 21Z" />
      <path d="M16 21C16 18 18.5 15.5 22.5 15.5C22.5 18.5 20 21 16 21Z" />
    </Svg>
  );
}

function DropIcon() {
  return (
    <Svg>
      <path d="M16 4C16 4 7 14 7 20A9 9 0 0 0 25 20C25 14 16 4 16 4Z" />
      <path d="M11.5 20.5A4.5 4.5 0 0 0 15 24.5" />
    </Svg>
  );
}

function PackageIcon() {
  return (
    <Svg>
      <path d="M5 11L16 5L27 11V23L16 29L5 23V11Z" />
      <path d="M5 11L16 17L27 11" />
      <line x1="16" y1="17" x2="16" y2="29" />
      <path d="M10.5 8L21.5 14V18" />
    </Svg>
  );
}

/* ─── Trust items ───────────────────────────────────────────────── */
const TRUST_ITEMS = [
  { Icon: LeafIcon, title: "Thoughtfully Chosen", subtitle: "Only the best for your home & garden" },
  { Icon: SproutIcon, title: "Plant Care Essentials", subtitle: "Everything your plants need" },
  { Icon: DropIcon, title: "Natural Ingredients", subtitle: "Pure, plant-based goodness" },
  { Icon: PackageIcon, title: "Carefully Packed", subtitle: "Packed with care for the journey" },
];

/* Grid lines between cells in the 2 × 2 layout (below lg). */
function gridBorderClass(i) {
  return [i % 2 === 1 && "border-l", i >= 2 && "border-t"].filter(Boolean).join(" ");
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function TrustBar() {
  return (
    <section aria-label="Why shop with Soil & Soul" className="bg-[#f6f4ec] py-5 sm:py-6 lg:py-5">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10">
        <ul
          role="list"
          className="list-none m-0 p-0 grid grid-cols-2 lg:grid-cols-4
                     rounded-2xl bg-[#eef0e3] border border-[#e2e5d4] lg:border-0
                     lg:px-4 xl:px-8 lg:py-5"
        >
          {TRUST_ITEMS.map(({ Icon, title, subtitle }, i) => (
            <li
              key={title}
              className={`relative flex flex-col items-center text-center gap-2 px-2.5 py-4
                          sm:flex-row sm:text-left sm:gap-3.5 sm:px-5 lg:gap-3 lg:px-3
                          lg:justify-center lg:py-0 lg:border-0 border-[#dfe3cf]
                          ${gridBorderClass(i)}`}
            >
              {/* Short vertical divider (lg+) */}
              {i > 0 && (
                <span
                  className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 h-10 w-px bg-[#d6dbc4]"
                  aria-hidden="true"
                />
              )}
              <span
                className="flex items-center justify-center flex-shrink-0 rounded-full
                           w-10 h-10 sm:w-12 sm:h-12 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 bg-[#dfe6d0] text-[#24452a]"
              >
                <Icon />
              </span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[0.8125rem] sm:text-sm 2xl:text-[0.9375rem] font-semibold xl:whitespace-nowrap text-[#1b2a1c]">
                  {title}
                </span>
                <span className="text-xs 2xl:text-[0.8125rem] leading-snug xl:whitespace-nowrap text-[#5e6858]">
                  {subtitle}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
