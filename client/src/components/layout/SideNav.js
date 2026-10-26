"use client";

/**
 * SideNav — sidebar navigation shared by the Account and Admin areas.
 * Desktop: vertical list. Mobile/tablet: horizontally scrollable pills.
 *
 * items: [{ label, href, icon, exact? }]
 * `onLogout` renders a Logout action after the list when provided.
 * `compact` shows an icon-only vertical rail (labels stay available to screen readers and as
 * hover tooltips); the footer is omitted in compact mode.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";

function isActive(pathname, item) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function SideNav({ items, label, footer, onLogout, compact = false, id }) {
  const pathname = usePathname();
  const size = compact ? "justify-center w-11 h-11 px-0" : "gap-3 px-3.5 h-10 lg:h-11";
  const idle = compact ? "bg-transparent text-ink hover:bg-sage-50" : "bg-white lg:bg-transparent border border-line lg:border-0 text-ink hover:bg-sage-50";

  return (
    <nav aria-label={label} id={id}>
      <ul
        className={`list-none m-0 p-0 flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          compact ? "flex-col items-center gap-1" : "gap-2 overflow-x-auto pb-1 lg:pb-0 lg:flex-col lg:gap-1"
        }`}
      >
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="flex-shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={compact ? item.label : undefined}
                className={`flex items-center rounded-lg ${size} text-sm no-underline whitespace-nowrap transition-colors
                            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                            ${active ? "bg-forest text-cream font-medium" : idle}`}
              >
                <Icon name={item.icon} size={18} />
                {compact ? <span className="sr-only">{item.label}</span> : item.label}
              </Link>
            </li>
          );
        })}
        {onLogout && (
          <li className={`flex-shrink-0 ${compact ? "mt-2 pt-2 border-t border-line" : "lg:mt-3 lg:pt-3 lg:border-t lg:border-line"}`}>
            <button
              type="button"
              onClick={onLogout}
              title={compact ? "Logout" : undefined}
              className={`flex items-center rounded-lg ${compact ? "justify-center w-11 h-11 px-0 border-0 bg-transparent" : "w-full gap-3 px-3.5 h-10 lg:h-11 bg-white lg:bg-transparent border border-line lg:border-transparent"}
                          text-sm whitespace-nowrap cursor-pointer text-ink hover:bg-sage-50
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest`}
            >
              <Icon name="logout" size={18} />
              {compact ? <span className="sr-only">Logout</span> : "Logout"}
            </button>
          </li>
        )}
      </ul>
      {!compact && footer}
    </nav>
  );
}
