"use client";

/**
 * AdminSidebar — signed-in admin + navigation (shared SideNav) and logout.
 * Only sections backed by the API are listed.
 *
 * The menu can be hidden to give pages more room (`collapsed`, toggled by `onToggle`; the
 * choice is remembered by AdminRouteFrame). Collapsed, it becomes a slim icon rail on large
 * screens and a single "Show menu" button on small screens.
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

const MENU_ID = "admin-menu";

function ToggleButton({ collapsed, onToggle, showLabel = false, className = "" }) {
  const label = collapsed ? "Show menu" : "Hide menu";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls={MENU_ID}
      title={label}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white text-sm text-ink cursor-pointer
                  hover:bg-sage-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                  ${showLabel ? "h-9 px-3" : "h-9 w-9"} ${className}`}
    >
      <Icon name="menu" size={18} />
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </button>
  );
}

export default function AdminSidebar({ collapsed = false, onToggle }) {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const name = user?.name ?? "";
  const handleLogout = async () => {
    await logout();
    notify("You've been signed out.");
    router.push("/");
  };

  if (collapsed) {
    return (
      <aside className="min-w-0 lg:sticky lg:top-24">
        {/* Small screens: the menu is hidden behind one button. */}
        <ToggleButton collapsed onToggle={onToggle} showLabel className="lg:hidden" />
        {/* Large screens: slim icon rail. */}
        <div className="hidden lg:flex flex-col items-center gap-3">
          <ToggleButton collapsed onToggle={onToggle} />
          <SideNav id={MENU_ID} label="Admin" items={ITEMS} compact onLogout={handleLogout} />
        </div>
      </aside>
    );
  }

  return (
    <aside className="min-w-0 lg:sticky lg:top-24">
      <div className="hidden lg:flex items-center gap-3.5 mb-5 px-1">
        <span className={`${brandSerif.className} flex items-center justify-center w-14 h-14 flex-shrink-0 rounded-full bg-sage-50 text-2xl font-bold text-forest`} aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${brandSerif.className} m-0 text-lg font-bold text-ink`}>{name}</p>
          <p className="m-0 text-xs text-muted">Administrator</p>
        </div>
        <ToggleButton collapsed={false} onToggle={onToggle} className="flex-shrink-0 self-start" />
      </div>
      <div className="flex justify-end mb-2 lg:hidden">
        <ToggleButton collapsed={false} onToggle={onToggle} showLabel />
      </div>
      <SideNav
        id={MENU_ID}
        label="Admin"
        items={ITEMS}
        onLogout={handleLogout}
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
