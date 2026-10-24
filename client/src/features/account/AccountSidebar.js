"use client";

/**
 * AccountSidebar — greeting card + account navigation.
 * Logout ends the session on the server (POST /auth/logout) and locally.
 */

import { useRouter } from "next/navigation";
import { brandSerif, scriptFont } from "@/app/fonts";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import SideNav from "@/components/layout/SideNav";
import BotanicalSprig from "@/components/ui/BotanicalSprig";

const ITEMS = [
  { label: "Dashboard", href: "/account", icon: "home", exact: true },
  { label: "My Orders", href: "/account/orders", icon: "box" },
  { label: "Wishlist", href: "/account/wishlist", icon: "heart" },
  { label: "Account Settings", href: "/account/settings", icon: "settings" },
];

export default function AccountSidebar() {
  const router = useRouter();
  const { notify } = useToast();
  const { user, logout } = useAuth();
  const name = user?.name ?? "";

  return (
    <aside className="min-w-0 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:p-5 lg:shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
      <div className="hidden lg:flex items-center gap-3.5 mb-5">
        <span className={`${brandSerif.className} flex items-center justify-center w-14 h-14 rounded-full bg-sage-50 text-2xl font-bold text-forest flex-shrink-0`} aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="m-0 text-sm text-muted">Hello,</p>
          <p className={`${brandSerif.className} m-0 text-lg font-bold text-ink truncate`}>{name}</p>
          <p className="m-0 text-xs text-muted truncate">{user?.email}</p>
        </div>
      </div>

      <SideNav
        label="Account"
        items={ITEMS}
        onLogout={async () => {
          await logout();
          notify("You've been signed out.");
          router.push("/");
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
