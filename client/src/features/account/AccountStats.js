"use client";

/**
 * AccountStats — summary cards: order count (from GET /orders), saved items
 * (this device's wishlist) and account status (only active accounts can sign in).
 */

import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { useWishlist } from "@/features/wishlist/WishlistProvider";
import Icon from "@/components/ui/Icon";

function Stat({ icon, label, value, href, cta, tone }) {
  return (
    <li className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
      <div className="flex items-center gap-3.5">
        <span className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${tone}`}>
          <Icon name={icon} size={22} />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-xs text-muted">{label}</p>
          <p className={`${brandSerif.className} m-0 text-2xl font-bold text-ink`}>{value}</p>
        </div>
      </div>
      <Link href={href} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-forest no-underline hover:underline">
        {cta} <Icon name="arrow-right" size={13} />
      </Link>
    </li>
  );
}

export default function AccountStats({ orderCount }) {
  const { slugs, isReady } = useWishlist();
  return (
    <ul className="list-none m-0 p-0 grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
      <Stat icon="box" label="Total Orders" value={orderCount} href="/account/orders" cta="View Orders" tone="bg-sage-50 text-forest" />
      <Stat icon="heart" label="Saved Items" value={isReady ? slugs.length : "–"} href="/account/wishlist" cta="View Wishlist" tone="bg-[#fbf1dc] text-[#8a5a10]" />
      <Stat icon="user" label="Account Status" value="Active" href="/account/settings" cta="Edit Profile" tone="bg-sage-50 text-forest" />
    </ul>
  );
}
