/**
 * Footer — site-wide footer, rendered from the root layout.
 *
 * Server Component. Layout:
 *   lg+      — brand | Shop | Quick Links | Customer Care | Contact | sprig.
 *   sm–lg    — brand on top, then link columns in a 4-column grid.
 *   below sm — brand on top, then link and contact columns in 2 columns.
 *
 * Contact details and social profiles are placeholders from the design —
 * replace them in FOOTER_CONTACT / SOCIAL_LINKS. Social icons only render
 * as links once a real `href` is set.
 */

import Link from "next/link";
import { brandSerif, scriptFont } from "@/app/fonts";
import { categoryHref } from "@/data/categories";
import { Leaf } from "@/components/ui/LeafArt";

/* ─── Data ──────────────────────────────────────────────────────── */
const LINK_COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "Live Plants", href: categoryHref("live-plants") },
      { label: "Pots & Planters", href: categoryHref("pots-planters") },
      { label: "Soil & Fertilizers", href: categoryHref("soil-fertilizers") },
      { label: "Seeds & Tools", href: categoryHref("seeds-tools") },
      { label: "Natural Care", href: categoryHref("natural-skincare") },
      { label: "Hair & Body Care", href: categoryHref("hair-body-care") },
    ],
  },
  {
    title: "Quick Links",
    links: [
      { label: "Home", href: "/" },
      { label: "About Us", href: "/our-story" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "FAQs", href: "/faqs" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "Shipping & Delivery", href: "/shipping" },
      { label: "Returns & Refunds", href: "/returns" },
      { label: "Track Order", href: "/track-order" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
];

const FOOTER_CONTACT = {
  address: ["Green Park, Bhopal,", "Madhya Pradesh, India"],
  phone: "+91 98765 43210",
  email: "hello@soilandsoul.in",
};

/* Set `href` to the real profile URL to turn each icon into a link. */
const SOCIAL_LINKS = [
  { label: "Instagram", icon: "instagram", href: null },
  { label: "Facebook", icon: "facebook", href: null },
  { label: "YouTube", icon: "youtube", href: null },
  { label: "Pinterest", icon: "pinterest", href: null },
];

/* Fixed year: Cache Components prerenders this layout, so `new Date()`
   would freeze at build time anyway. Update with each yearly release. */
const COPYRIGHT_YEAR = 2026;

/* ─── Icons ─────────────────────────────────────────────────────── */
function Svg({ size = 18, children, fill = "none" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const SOCIAL_ICONS = {
  instagram: (
    <Svg>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </Svg>
  ),
  facebook: (
    <Svg>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M13.5 21.5V13.5H16L16.5 10.5H13.5V8.8C13.5 7.9 13.8 7.3 15 7.3H16.6V4.7C16.3 4.6 15.4 4.5 14.4 4.5C12.2 4.5 10.6 5.8 10.6 8.3V10.5H8V13.5H10.6V21.5" />
    </Svg>
  ),
  youtube: (
    <Svg>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="M10 9L15 12L10 15Z" fill="currentColor" />
    </Svg>
  ),
  pinterest: (
    <Svg>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M11 9.5C11 8.5 11.8 7.8 12.9 7.8C14.4 7.8 15.3 8.9 15.3 10.3C15.3 12.3 14.2 13.8 12.8 13.8C12 13.8 11.5 13.2 11.6 12.5M11.4 12L10 18" />
    </Svg>
  ),
};

function PinIcon() {
  return (
    <Svg size={16}>
      <path d="M12 21.5S5 15 5 10a7 7 0 0 1 14 0c0 5-7 11.5-7 11.5Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}

function PhoneIcon() {
  return (
    <Svg size={16}>
      <path d="M21 16.5v3a2 2 0 0 1-2.2 2A19 19 0 0 1 2.5 5.2 2 2 0 0 1 4.5 3h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.4 10.9a16 16 0 0 0 4.7 4.7l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg size={16}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5L12 13L20.5 6.5" />
    </Svg>
  );
}

/* Brand mark, light version for the dark background. */
function LeafMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <path d="M7 45C10.5 40 13 35.5 16 30" stroke="#f4f1e8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 30C13.5 18 22 7 43 4C42 18 33 29.5 16 30Z" fill="#f4f1e8" />
      <path d="M17.5 28.5C24 21 31.5 13 39.5 7.5" stroke="#24452a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M14 34C7 33.5 2.5 27 2.5 17.5C10.5 18.5 15.5 25 14 34Z" fill="#f4f1e8" />
      <path d="M13.5 32C10.5 28 7.5 24 4.5 20" stroke="#24452a" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

/* Line-art plant + handwritten tagline (shown xl+). */
const PLANT_LEAVES = [
  { x: 50, y: 150, rotate: -60, scale: 0.75 },
  { x: 52, y: 132, rotate: 55, scale: 0.8 },
  { x: 54, y: 108, rotate: -50, scale: 0.85 },
  { x: 56, y: 86, rotate: 45, scale: 0.85 },
  { x: 58, y: 64, rotate: -35, scale: 0.75 },
  { x: 60, y: 46, rotate: 20, scale: 0.7 },
];

function FooterSprig() {
  return (
    <div className="flex items-start gap-1 text-[#f4f1e8]/80" aria-hidden="true">
      <svg width="96" height="160" viewBox="0 0 110 180" fill="none" focusable="false">
        <path d="M48 180C50 140 56 90 62 40" stroke="rgba(244,241,232,0.5)" strokeWidth="1.2" strokeLinecap="round" />
        {PLANT_LEAVES.map((leaf) => (
          <Leaf
            key={leaf.y}
            {...leaf}
            fill="none"
            stroke="rgba(244,241,232,0.55)"
            veinStroke="rgba(244,241,232,0.35)"
          />
        ))}
      </svg>
      <p
        className={`${scriptFont.className} m-0 mt-2 -rotate-12 text-[1.55rem] xl:text-[1.75rem] leading-[1.05]`}
      >
        Good Choices,
        <br />
        &nbsp;&nbsp;Greener
        <br />
        &nbsp;&nbsp;&nbsp;&nbsp;Tomorrows
      </p>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */
const linkClass =
  "text-[0.8125rem] text-[#f4f1e8]/80 no-underline transition-colors duration-150 hover:text-white " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f1e8] rounded-sm";

export default function Footer() {
  return (
    <footer className="mt-auto bg-[#24452a] text-[#f4f1e8] font-sans">
      <div className="max-w-[1536px] mx-auto px-5 sm:px-8 xl:px-10">
        <div
          className="grid grid-cols-2 gap-x-6 gap-y-9 pt-12 pb-10 sm:grid-cols-4
                     lg:grid-cols-[1.35fr_1fr_1fr_1.1fr_1.25fr] xl:grid-cols-[1.35fr_1fr_1fr_1.1fr_1.25fr_auto] lg:gap-x-8"
        >
          {/* Brand */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <Link
              href="/"
              aria-label="Soil & Soul — home"
              className="inline-flex items-center gap-2.5 no-underline text-[#f4f1e8]
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4f1e8] rounded"
            >
              <LeafMark />
              <span className="flex flex-col leading-none">
                <span className={`${brandSerif.className} text-[1.5rem] font-semibold`}>Soil &amp; Soul</span>
                <span className="mt-1 text-[0.5rem] font-semibold tracking-[0.12em] uppercase whitespace-nowrap text-[#f4f1e8]/75">
                  Plants · Gardening · Natural Care
                </span>
              </span>
            </Link>
            <p className="m-0 mt-4 text-[0.8125rem] text-[#f4f1e8]/80">Greener homes. Healthier lives.</p>

            <ul role="list" className="list-none m-0 mt-4 p-0 flex items-center gap-2">
              {SOCIAL_LINKS.map(({ label, icon, href }) => (
                <li key={icon}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Soil & Soul on ${label}`}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[#f4f1e8]/85
                                 transition-colors duration-150 hover:bg-white/10 hover:text-white
                                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f4f1e8]"
                    >
                      {SOCIAL_ICONS[icon]}
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center w-9 h-9 text-[#f4f1e8]/85" aria-hidden="true">
                      {SOCIAL_ICONS[icon]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          {LINK_COLUMNS.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2 className="m-0 text-sm font-semibold text-white">{title}</h2>
              <ul role="list" className="list-none m-0 mt-3.5 p-0 grid gap-2">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact */}
          <div>
            <h2 className="m-0 text-sm font-semibold text-white">Contact Us</h2>
            <address className="not-italic mt-3.5 grid gap-2.5 text-[0.8125rem] text-[#f4f1e8]/80">
              <p className="m-0 flex gap-2.5">
                <span className="mt-px flex-shrink-0"><PinIcon /></span>
                <span>
                  {FOOTER_CONTACT.address[0]}
                  <br />
                  {FOOTER_CONTACT.address[1]}
                </span>
              </p>
              <p className="m-0 flex items-center gap-2.5">
                <span className="flex-shrink-0"><PhoneIcon /></span>
                <a href={`tel:${FOOTER_CONTACT.phone.replace(/\s/g, "")}`} className={linkClass}>
                  {FOOTER_CONTACT.phone}
                </a>
              </p>
              <p className="m-0 flex items-center gap-2.5">
                <span className="flex-shrink-0"><MailIcon /></span>
                <a href={`mailto:${FOOTER_CONTACT.email}`} className={linkClass}>
                  {FOOTER_CONTACT.email}
                </a>
              </p>
            </address>
          </div>

          {/* Decorative sprig + tagline (xl+) */}
          <div className="hidden xl:block">
            <FooterSprig />
          </div>
        </div>

        <div className="border-t border-white/15 py-5">
          <p className="m-0 text-xs text-[#f4f1e8]/70">
            &copy; {COPYRIGHT_YEAR} Soil &amp; Soul. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
