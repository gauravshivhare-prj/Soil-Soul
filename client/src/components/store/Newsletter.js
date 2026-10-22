"use client";

/**
 * Newsletter — "Join Our Newsletter" sign-up band above the footer.
 *
 * Client Component (form state). There is no subscription backend yet, so
 * submitting validates the email in the browser and shows a "coming soon"
 * note instead of claiming the user was subscribed. Replace `handleSubmit`
 * with the real API call later.
 */

import { useState } from "react";
import { brandSerif } from "@/app/fonts";
import { Leaf } from "@/components/ui/LeafArt";

/* Sprigs at the band's left and right ends (lg+). */
const LEFT_SPRIG = [
  { x: 38, y: 92, rotate: -40, scale: 0.85 },
  { x: 52, y: 70, rotate: 25, scale: 0.9 },
  { x: 62, y: 46, rotate: -55, scale: 0.75 },
  { x: 76, y: 30, rotate: 40, scale: 0.7 },
  { x: 30, y: 112, rotate: -95, scale: 0.8 },
];

const RIGHT_SPRIG = [
  { x: 62, y: 96, rotate: 40, scale: 0.85 },
  { x: 50, y: 72, rotate: -25, scale: 0.9 },
  { x: 42, y: 48, rotate: 55, scale: 0.75 },
  { x: 30, y: 30, rotate: -40, scale: 0.7 },
  { x: 72, y: 114, rotate: 95, scale: 0.8 },
];

function Sprig({ leaves, stem, className }) {
  return (
    <svg
      className={`hidden lg:block absolute top-1/2 -translate-y-1/2 h-[120%] w-auto pointer-events-none ${className}`}
      viewBox="0 0 110 130"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={stem} stroke="#9cb38b" strokeWidth="1.2" strokeLinecap="round" />
      {leaves.map((leaf) => (
        <Leaf key={`${leaf.x}-${leaf.y}`} {...leaf} />
      ))}
    </svg>
  );
}

function ArrowRightIcon() {
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
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function Newsletter() {
  const [notice, setNotice] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    // Browser validation (type="email" + required) has already passed here.
    setNotice("Thanks for your interest! Newsletter sign-ups are opening soon.");
    event.currentTarget.reset();
  }

  return (
    <section aria-labelledby="newsletter-heading" className="relative overflow-hidden bg-[#eef0e3] border-y border-[#e2e5d4]">
      <Sprig leaves={LEFT_SPRIG} stem="M10 135C30 100 55 60 85 20" className="-left-2" />
      <Sprig leaves={RIGHT_SPRIG} stem="M100 135C80 100 55 60 25 20" className="-right-2" />

      <div
        className="relative max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-28 xl:px-36 py-8 lg:py-9
                   flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8"
      >
        <div className="min-w-0">
          <h2
            id="newsletter-heading"
            className={`${brandSerif.className} m-0 font-bold leading-tight text-[#1f3d24] text-[1.35rem] sm:text-[1.5rem]`}
          >
            Join Our Newsletter
          </h2>
          <p className="m-0 mt-1 text-[0.8125rem] sm:text-sm leading-relaxed text-[#5e6858]">
            Get tips, new arrivals and plant care guides straight to your inbox.
          </p>
        </div>

        <div className="relative w-full md:w-auto md:flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex w-full md:w-[26rem] xl:w-[30rem] gap-2 sm:gap-0">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="Enter your email address"
              onChange={() => notice && setNotice("")}
              className="flex-1 min-w-0 h-11 px-4 rounded-lg sm:rounded-r-none border border-[#dfe2d2] sm:border-r-0
                         bg-white text-base sm:text-sm text-[#1f241d] placeholder:text-[#9a9a90]
                         outline-none focus:border-[#24452a] focus:ring-2 focus:ring-[#24452a]/15"
            />
            <button
              type="submit"
              className="inline-flex flex-shrink-0 items-center gap-2 h-11 px-4 sm:px-6 rounded-lg sm:rounded-l-none border-0 cursor-pointer
                         bg-[#24452a] text-[#f4f1e8] text-sm font-medium
                         transition-colors duration-200 hover:bg-[#1b3520]
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]"
            >
              Subscribe
              <ArrowRightIcon />
            </button>
          </form>
          <p role="status" className="m-0 mt-2 text-xs text-[#3d5a35] md:absolute md:left-0 md:top-full">
            {notice}
          </p>
        </div>
      </div>
    </section>
  );
}
