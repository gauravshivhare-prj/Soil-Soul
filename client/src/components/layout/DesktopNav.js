"use client";

/**
 * DesktopNav — primary links for `lg` and up.
 *
 * Client Component only so it can read the current path and draw the
 * active-page underline along the header's bottom edge.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

function ChevronDownIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export default function DesktopNav({ links }) {
  const pathname = usePathname();

  return (
    <ul
      className="hidden lg:flex self-stretch items-stretch gap-0 xl:gap-1 list-none m-0 p-0 flex-1 min-w-0 justify-center"
      role="list"
    >
      {links.map(({ label, href, hasMenu }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href} className="flex">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-1 px-2 xl:px-2.5 2xl:px-3.5 whitespace-nowrap no-underline
                          text-sm 2xl:text-[0.9375rem] transition-colors duration-150
                          hover:text-[#24452a]
                          after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-0 after:h-[2px]
                          after:rounded-full after:bg-[#24452a] after:transition-all after:duration-200
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#24452a] focus-visible:-outline-offset-4
                          ${active
                            ? "font-semibold text-[#1b2a1c] after:w-6"
                            : "font-medium text-[#2b3128] after:w-0 hover:after:w-4"}`}
            >
              {label}
              {hasMenu && <ChevronDownIcon />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
