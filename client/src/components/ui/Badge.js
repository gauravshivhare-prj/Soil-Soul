/**
 * Badge — small pill labels; StatusBadge — order/review/stock statuses.
 */

import Icon from "@/components/ui/Icon";

const TONES = {
  sage: "bg-sage-50 text-[#3d5a35]",
  forest: "bg-forest text-cream",
  gold: "bg-[#fbf1dc] text-[#8a5a10]",
  blue: "bg-[#e8eefb] text-[#2b4a8b]",
  danger: "bg-[#fdecea] text-danger",
  neutral: "bg-sand text-muted",
};

export default function Badge({ tone = "sage", icon, className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {icon && <Icon name={icon} size={12} strokeWidth={2.25} />}
      {children}
    </span>
  );
}

const STATUS = {
  placed: { tone: "neutral", icon: "check", label: "Placed" },
  confirmed: { tone: "blue", icon: "check", label: "Confirmed" },
  paid: { tone: "sage", icon: "check", label: "Paid" },
  failed: { tone: "danger", icon: "x", label: "Failed" },
  refunded: { tone: "neutral", icon: "refresh", label: "Refunded" },
  partially_refunded: { tone: "gold", icon: "refresh", label: "Partly Refunded" },
  inactive: { tone: "neutral", icon: "eye-off", label: "Inactive" },
  archived: { tone: "neutral", icon: "folder", label: "Archived" },
  delivered: { tone: "sage", icon: "check-circle", label: "Delivered" },
  shipped: { tone: "blue", icon: "truck", label: "Shipped" },
  processing: { tone: "gold", icon: "clock", label: "Processing" },
  cancelled: { tone: "danger", icon: "x-circle", label: "Cancelled" },
  approved: { tone: "sage", icon: "check", label: "Approved" },
  pending: { tone: "gold", icon: "clock", label: "Pending" },
  hidden: { tone: "neutral", icon: "eye-off", label: "Hidden" },
  active: { tone: "sage", icon: "check", label: "Active" },
  blocked: { tone: "danger", icon: "x", label: "Blocked" },
  "in-stock": { tone: "sage", icon: "check", label: "In Stock" },
  "low-stock": { tone: "gold", icon: "alert", label: "Low Stock" },
  "out-of-stock": { tone: "danger", icon: "x", label: "Out of Stock" },
};

export function StatusBadge({ status, label, className }) {
  const s = STATUS[status] ?? { tone: "neutral", label: status };
  return (
    <Badge tone={s.tone} icon={s.icon} className={className}>
      {label ?? s.label}
    </Badge>
  );
}

/* Stock status helper shared by product and admin views. */
export function stockStatus(stock, lowThreshold = 6) {
  if (stock <= 0) return "out-of-stock";
  if (stock <= lowThreshold) return "low-stock";
  return "in-stock";
}
