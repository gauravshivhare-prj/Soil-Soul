/**
 * FindYourPlant — plant-finder teaser strip.
 *
 * Server Component. Layout:
 *   xl+      — single row: intro | three features (dividers) | button.
 *   below xl — intro, then the three features as tiles, then the button
 *              (full width on mobile).
 */

import Link from "next/link";
import { brandSerif } from "@/app/fonts";

/* ─── Icons ─────────────────────────────────────────────────────── */
function Svg({ size = 28, strokeWidth = 1.5, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
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
    <Svg size={30}>
      <path d="M6 26C6 26 4 14 12 8C18 4 26 5 26 5C26 5 28 17 20 23C14 27 6 26 6 26Z" />
      <path d="M6 26C12 20 18 14 26 5" />
      <path d="M12 21C14 18 14 15 13 12" />
      <path d="M18 16C20 14 20 11 19 8" />
    </Svg>
  );
}

/* Low light — sun with short rays. */
function SunDimIcon() {
  return (
    <Svg>
      <circle cx="16" cy="16" r="6" />
      <path d="M16 5.5V7.5M16 24.5V26.5M5.5 16H7.5M24.5 16H26.5M8.6 8.6L10 10M22 22L23.4 23.4M8.6 23.4L10 22M22 10L23.4 8.6" />
    </Svg>
  );
}

/* Bright light — sun with long rays. */
function SunIcon() {
  return (
    <Svg>
      <circle cx="16" cy="16" r="5.5" />
      <path d="M16 3V7.5M16 24.5V29M3 16H7.5M24.5 16H29M6.8 6.8L10 10M22 22L25.2 25.2M6.8 25.2L10 22M22 10L25.2 6.8" />
    </Svg>
  );
}

/* Easy care — sprout with two leaves. */
function SproutIcon() {
  return (
    <Svg>
      <path d="M16 28V15" />
      <path d="M16 15C16 9.5 12 5 5 5C5 11 9.5 15 16 15Z" />
      <path d="M16 19C16 14 19.5 10 26 10C26 15.5 22 19 16 19Z" />
    </Svg>
  );
}

function ArrowRight() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const FEATURES = [
  { Icon: SunDimIcon, title: "Low Light", subtitle: "Perfect for indoor spaces" },
  { Icon: SunIcon, title: "Bright Light", subtitle: "Loves the sunshine" },
  { Icon: SproutIcon, title: "Easy Care", subtitle: "Great for beginners" },
];

/* ─── Component ─────────────────────────────────────────────────── */
export default function FindYourPlant() {
  return (
    <section aria-labelledby="find-your-plant-heading" className="bg-[#faf8f2] pb-8 lg:pb-10">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10">
        <div
          className="flex flex-col gap-6 xl:flex-row xl:items-center xl:gap-0
                     rounded-2xl border border-[#e2e5d4] bg-[#eef0e3]
                     px-5 py-5 sm:px-8 xl:py-5"
        >
          {/* Intro */}
          <div className="flex items-center gap-4 xl:pr-8 2xl:pr-10 xl:flex-shrink-0">
            <span className="flex flex-shrink-0 items-center justify-center w-14 h-14 xl:w-16 xl:h-16 rounded-full bg-[#dfe6d0] text-[#24452a]">
              <LeafIcon />
            </span>
            <div className="min-w-0">
              <h2
                id="find-your-plant-heading"
                className={`${brandSerif.className} m-0 font-bold leading-tight text-[#1f3d24]
                            text-[1.35rem] sm:text-[1.5rem] xl:text-[1.65rem]`}
              >
                Find Your Plant
              </h2>
              <p className="m-0 mt-1 text-[0.8125rem] leading-snug text-[#5e6858]">
                Choose the perfect plant for your space and lifestyle.
              </p>
            </div>
          </div>

          {/* Features */}
          <ul
            role="list"
            className="list-none m-0 p-0 grid grid-cols-3 gap-2 sm:gap-4
                       xl:flex xl:flex-1 xl:gap-0"
          >
            {FEATURES.map(({ Icon, title, subtitle }) => (
              <li
                key={title}
                className="flex flex-col items-center text-center gap-2 rounded-xl bg-[#f6f7ef] px-2 py-4
                           sm:flex-row sm:text-left sm:gap-3 sm:px-4
                           xl:flex-1 xl:justify-center xl:rounded-none xl:bg-transparent xl:py-1 xl:px-4
                           xl:border-l xl:border-[#d6dbc4] 2xl:px-6"
              >
                <span className="flex-shrink-0 text-[#24452a]">
                  <Icon />
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[0.8125rem] sm:text-sm font-semibold text-[#1b2a1c]">{title}</span>
                  <span className="text-[0.6875rem] sm:text-xs leading-snug text-[#5e6858] xl:whitespace-nowrap">{subtitle}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href="/plants"
            className="group inline-flex flex-shrink-0 items-center justify-center gap-2 h-11 xl:h-10 px-6 sm:self-start xl:self-auto xl:ml-4 2xl:ml-6
                       rounded-lg bg-[#24452a] text-[#f4f1e8] text-[0.875rem] xl:text-[0.8125rem] font-medium no-underline whitespace-nowrap
                       transition-colors duration-200 hover:bg-[#1b3520]
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]"
          >
            Explore Plants
            <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}
