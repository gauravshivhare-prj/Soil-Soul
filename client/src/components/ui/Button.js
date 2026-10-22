/**
 * Button — shared action styles. Renders a Next.js <Link> when `href` is
 * given, otherwise a <button>.
 *
 * variant: "primary" (forest) | "outline" | "light" (on dark/green) | "ghost" | "danger"
 * size:    "sm" | "md" | "lg"
 */

import Link from "next/link";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap no-underline cursor-pointer " +
  "transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-55 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";

const VARIANTS = {
  primary: "border border-forest bg-forest text-cream hover:bg-forest-dark hover:border-forest-dark",
  outline: "border border-forest/70 bg-white text-heading hover:bg-forest hover:text-cream hover:border-forest",
  light: "border border-white bg-cream text-heading hover:bg-white",
  ghost: "border border-transparent bg-transparent text-forest hover:bg-sage-50",
  danger: "border border-danger/40 bg-white text-danger hover:bg-[#fdecea]",
};

const SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[0.9375rem]",
};

export function buttonClass({ variant = "primary", size = "md", block = false, className = "" } = {}) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${block ? "w-full" : ""} ${className}`;
}

export default function Button({ href, variant, size, block, className, children, type = "button", ...rest }) {
  const cls = buttonClass({ variant, size, block, className });
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
