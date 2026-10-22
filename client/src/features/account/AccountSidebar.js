"use client";

/**
 * AccountSidebar — greeting card + account navigation.
 * Logout is simulated: there's no real session to end yet.
 */

import { useRouter } from "next/navigation";
import { brandSerif, scriptFont } from "@/app/fonts";
import { formatMonthYear } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import SideNav from "@/components/layout/SideNav";
import BotanicalSprig from "@/components/ui/BotanicalSprig";

const ITEMS = [
  { label: "Dashboard", href: "/account", icon: "home", exact: true },
  { label: "My Orders", href: "/account/orders", icon: "box" },
  { label: "Wishlist", href: "/account/wishlist", icon: "heart" },
  { label: "Addresses", href: "/account/addresses", icon: "pin" },
  { label: "Payment Methods", href: "/account/payments", icon: "card" },
  { label: "Account Settings", href: "/account/settings", icon: "settings" },
];

export default function AccountSidebar({ user }) {
  const router = useRouter();
  const { notify } = useToast();

  return (
    <aside className="min-w-0 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:p-5 lg:shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
      <div className="hidden lg:flex items-center gap-3.5 mb-5">
        <span className={`${brandSerif.className} flex items-center justify-center w-14 h-14 rounded-full bg-sage-50 text-2xl font-bold text-forest flex-shrink-0`} aria-hidden="true">
          {user.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="m-0 text-sm text-muted">Hello,</p>
          <p className={`${brandSerif.className} m-0 text-lg font-bold text-ink truncate`}>{user.name}</p>
          <p className="m-0 text-xs text-muted">Member since {formatMonthYear(user.memberSince)}</p>
        </div>
      </div>

      <SideNav
        label="Account"
        items={ITEMS}
        onLogout={() => {
          notify("Demo mode: there's no real session, so nothing was signed out.");
          router.push("/login");
        }}
        footer={
          <div className="relative hidden lg:block mt-6 overflow-hidden rounded-xl bg-sage-50 px-5 py-6">
            <BotanicalSprig className="-left-6 -bottom-6 h-[120%] opacity-60" rotate={-6} />
            <p className={`${scriptFont.className} relative m-0 pl-16 text-[1.5rem] leading-tight text-heading`}>
              Good Choices,
              <br />
              Greener Tomorrows
            </p>
          </div>
        }
      />
    </aside>
  );
}
