"use client";

/**
 * AdminSidebar — admin profile + navigation (shared SideNav).
 */

import { brandSerif, scriptFont } from "@/app/fonts";
import SideNav from "@/components/layout/SideNav";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import BotanicalSprig from "@/components/ui/BotanicalSprig";

const ITEMS = [
  { label: "Dashboard", href: "/admin", icon: "home", exact: true },
  { label: "Products", href: "/admin/products", icon: "box" },
  { label: "Categories", href: "/admin/categories", icon: "folder" },
  { label: "Orders", href: "/admin/orders", icon: "bag" },
  { label: "Customers", href: "/admin/customers", icon: "users" },
  { label: "Reviews", href: "/admin/reviews", icon: "star" },
  { label: "Coupons & Offers", href: "/admin/coupons", icon: "ticket" },
  { label: "Analytics", href: "/admin/analytics", icon: "chart" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
];

export default function AdminSidebar({ profile }) {
  return (
    <aside className="min-w-0 lg:sticky lg:top-24">
      <div className="hidden lg:flex items-center gap-3.5 mb-5 px-1">
        <span className={`${brandSerif.className} flex items-center justify-center w-14 h-14 rounded-full bg-sage-50 text-2xl font-bold text-forest`} aria-hidden="true">
          {profile.name.charAt(0)}
        </span>
        <div>
          <p className={`${brandSerif.className} m-0 text-lg font-bold text-ink`}>{profile.name}</p>
          <p className="m-0 text-xs text-muted">{profile.role}</p>
        </div>
      </div>
      <SideNav
        label="Admin"
        items={ITEMS}
        footer={
          <div className="hidden lg:block mt-6">
            <div className="relative overflow-hidden rounded-xl bg-sage-50 px-5 py-6">
              <BotanicalSprig className="-left-6 -bottom-6 h-[120%] opacity-60" rotate={-6} />
              <p className={`${scriptFont.className} relative m-0 pl-16 text-[1.4rem] leading-tight text-heading`}>
                Good Choices,
                <br />
                Greener Tomorrows
              </p>
            </div>
            <Button href="/" variant="outline" block className="mt-4">
              <Icon name="arrow-left" size={16} /> Back to Store
            </Button>
          </div>
        }
      />
    </aside>
  );
}
