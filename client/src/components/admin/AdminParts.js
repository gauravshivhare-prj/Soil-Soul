/**
 * Small admin building blocks: page header, stat card, data table shell,
 * and the customer initial avatar.
 */

import Icon from "@/components/ui/Icon";
import { brandSerif } from "@/app/fonts";

export function AdminHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5">
      <div className="min-w-0">
        <h1 className={`${brandSerif.className} m-0 text-[1.6rem] sm:text-[2rem] leading-tight font-bold text-heading`}>{title}</h1>
        {subtitle && <p className="m-0 mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, change, note, tone = "sage" }) {
  const toneClass = tone === "gold" ? "bg-[#fbf1dc] text-[#8a5a10]" : "bg-sage-50 text-forest";
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
      <div className="flex items-start gap-3.5">
        <span className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${toneClass}`}>
          <Icon name={icon} size={22} />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-xs sm:text-[0.8125rem] text-muted">{label}</p>
          <p className="m-0 mt-0.5 flex flex-wrap items-center gap-2">
            <span className={`${brandSerif.className} text-2xl sm:text-[1.65rem] font-bold text-ink`}>{value}</span>
            {change != null && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-sage-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-[#3d5a35]">
                <Icon name="arrow-right" size={11} strokeWidth={2.5} className="-rotate-90" />
                {change}%<span className="sr-only"> increase</span>
              </span>
            )}
          </p>
          {note && <p className="m-0 mt-0.5 text-xs text-muted">{note}</p>}
        </div>
      </div>
    </div>
  );
}

/* Horizontally scrollable table wrapper with consistent cell styling. */
export function DataTable({ caption, head, children, minWidth = 640 }) {
  return (
    <div className="relative overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <table className="w-full text-sm border-collapse" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold text-muted">
            {head.map((h) => (
              <th key={h} scope="col" className="py-2.5 pr-4 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0 [&_td]:py-3 [&_td]:pr-4">{children}</tbody>
      </table>
    </div>
  );
}

export function Avatar({ name }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-sage-50 text-xs font-semibold text-forest flex-shrink-0" aria-hidden="true">
      {name.replace(/^Customer\s+/, "").charAt(0)}
    </span>
  );
}
