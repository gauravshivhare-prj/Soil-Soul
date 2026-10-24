/**
 * Shared empty / loading / notice states.
 */

import { brandSerif } from "@/app/fonts";
import Icon from "@/components/ui/Icon";

export function EmptyState({ icon = "leaf", title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center text-center px-6 py-12 sm:py-16 ${className}`}>
      <span className="flex items-center justify-center w-16 h-16 rounded-full bg-sage-50 text-forest">
        <Icon name={icon} size={28} strokeWidth={1.5} />
      </span>
      <h2 className={`${brandSerif.className} m-0 mt-4 text-xl sm:text-[1.4rem] font-bold text-heading`}>{title}</h2>
      {description && <p className="m-0 mt-2 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`rounded-md bg-sand motion-safe:animate-pulse ${className}`} aria-hidden="true" />;
}

/* Grid of product-card-shaped skeletons for loading states. */
export function ProductGridSkeleton({ count = 8, className = "" }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 ${className}`} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-line bg-white overflow-hidden">
          <Skeleton className="aspect-[25/22] rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Demo-mode notice for simulated features (payments, auth, admin). */
export function DemoNotice({ children, className = "" }) {
  return (
    <p className={`m-0 flex items-start gap-2 rounded-lg border border-[#f0dfb8] bg-[#fdf7ea] px-3 py-2 text-xs text-[#7a5410] ${className}`}>
      <span className="mt-px flex-shrink-0"><Icon name="info" size={15} /></span>
      <span>{children}</span>
    </p>
  );
}

/* Inline status for forms and API results: tone "error" | "success" | "info". */
const TONES = {
  error: { cls: "border-danger/30 bg-danger/5 text-danger", icon: "info", role: "alert" },
  success: { cls: "border-forest/25 bg-sage-100/60 text-forest", icon: "check", role: "status" },
  info: { cls: "border-line bg-sand/60 text-body", icon: "info", role: "status" },
};

export function FormMessage({ tone = "info", children, className = "" }) {
  if (!children) return null;
  const t = TONES[tone] ?? TONES.info;
  return (
    <p role={t.role} className={`m-0 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${t.cls} ${className}`}>
      <span className="mt-px flex-shrink-0"><Icon name={t.icon} size={16} /></span>
      <span>{children}</span>
    </p>
  );
}
