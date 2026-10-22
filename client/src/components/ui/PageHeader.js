/**
 * PageContainer — shared page width and gutters (matches the homepage).
 * PageHeader — breadcrumbs, serif title and optional subtitle/actions.
 * Breadcrumbs — "Home › Shop › Product" trail with aria-current.
 */

import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import Icon from "@/components/ui/Icon";

export function PageContainer({ as: Tag = "div", className = "", children }) {
  return <Tag className={`max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10 ${className}`}>{children}</Tag>;
}

export function Breadcrumbs({ items, className = "" }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="list-none m-0 p-0 flex flex-wrap items-center gap-1.5 text-xs sm:text-[0.8125rem] text-muted">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {isLast || !item.href ? (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-ink" : ""}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="text-muted no-underline hover:text-forest">
                  {item.label}
                </Link>
              )}
              {!isLast && <Icon name="chevron-right" size={13} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageTitle({ as: Tag = "h1", className = "", children, id }) {
  return (
    <Tag
      id={id}
      className={`${brandSerif.className} m-0 font-bold leading-tight text-heading text-[1.75rem] sm:text-[2.1rem] lg:text-[2.4rem] ${className}`}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({ as: Tag = "h2", className = "", children, id }) {
  return (
    <Tag id={id} className={`${brandSerif.className} m-0 font-bold leading-tight text-heading text-[1.3rem] sm:text-[1.5rem] ${className}`}>
      {children}
    </Tag>
  );
}

export default function PageHeader({ breadcrumbs, title, subtitle, actions, className = "" }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-2.5" />}
        <PageTitle>{title}</PageTitle>
        {subtitle && <p className="m-0 mt-1.5 text-sm sm:text-[0.9375rem] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
