"use client";

/**
 * AdminSidebar — signed-in admin + navigation (shared SideNav) and logout.
 * Only sections backed by the API are listed.
 */

import { useRouter } from "next/navigation";
import { brandSerif, scriptFont } from "@/app/fonts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import SideNav from "@/components/layout/SideNav";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import BotanicalSprig from "@/components/ui/BotanicalSprig";

const ITEMS = [
  { label: "Dashboard", href: "/admin", icon: "home", exact: true },
  { label: "Products", href: "/admin/products", icon: "box" },
  { label: "Categories", href: "/admin/categories", icon: "folder" },
  { label: "Inventory", href: "/admin/inventory", icon: "list" },
  { label: "Orders", href: "/admin/orders", icon: "bag" },
  { label: "Customers", href: "/admin/customers", icon: "users" },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const name = user?.name ?? "";
  return (
    <aside className="min-w-0 lg:sticky lg:top-24">
      <div className="hidden lg:flex items-center gap-3.5 mb-5 px-1">
        <span className={`${brandSerif.className} flex items-center justify-center w-14 h-14 rounded-full bg-sage-50 text-2xl font-bold text-forest`} aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className={`${brandSerif.className} m-0 text-lg font-bold text-ink`}>{name}</p>
          <p className="m-0 text-xs text-muted">Administrator</p>
        </div>
      </div>
      <SideNav
        label="Admin"
        items={ITEMS}
        onLogout={async () => {
          await logout();
          notify("You've been signed out.");
          router.push("/");
        }}
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
