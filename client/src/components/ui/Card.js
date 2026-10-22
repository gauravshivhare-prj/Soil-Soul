/**
 * Card — the shared rounded surface used across shop, account and admin.
 * CardHeader — title row with an optional action on the right.
 */

export default function Card({ as: Tag = "div", className = "", padded = true, children, ...rest }) {
  return (
    <Tag
      className={`rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(36,69,42,0.05)] ${padded ? "p-4 sm:p-5" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, titleAs: Title = "h2", action, className = "", id }) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-4 ${className}`}>
      <Title id={id} className="m-0 text-base sm:text-[1.0625rem] font-semibold text-ink">
        {title}
      </Title>
      {action}
    </div>
  );
}
