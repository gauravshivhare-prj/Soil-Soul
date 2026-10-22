"use client";

/**
 * SideNav — sidebar navigation shared by the Account and Admin areas.
 * Desktop: vertical list. Mobile/tablet: horizontally scrollable pills.
 *
 * items: [{ label, href, icon, exact? }]
 * `onLogout` renders a Logout action after the list when provided.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";

function isActive(pathname, item) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function SideNav({ items, label, footer, onLogout }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="list-none m-0 p-0 flex gap-2 overflow-x-auto pb-1 lg:pb-0 lg:flex-col lg:gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="flex-shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3.5 h-10 lg:h-11 text-sm no-underline whitespace-nowrap transition-colors
                            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                            ${active ? "bg-forest text-cream font-medium" : "bg-white lg:bg-transparent border border-line lg:border-0 text-ink hover:bg-sage-50"}`}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            </li>
          );
        })}
        {onLogout && (
          <li className="flex-shrink-0 lg:mt-3 lg:pt-3 lg:border-t lg:border-line">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 rounded-lg px-3.5 h-10 lg:h-11 text-sm whitespace-nowrap cursor-pointer
                         bg-white lg:bg-transparent border border-line lg:border-transparent text-ink hover:bg-sage-50
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              <Icon name="logout" size={18} />
              Logout
            </button>
          </li>
        )}
      </ul>
      {footer}
    </nav>
  );
}
