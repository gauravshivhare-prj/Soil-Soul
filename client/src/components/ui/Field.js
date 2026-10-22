"use client";

/**
 * Form controls with consistent labels, hints and error messages.
 * Errors are linked to inputs via aria-describedby and aria-invalid.
 * Inputs use 16px text on mobile so iOS Safari doesn't zoom on focus.
 */

import { useId, useState } from "react";
import Icon from "@/components/ui/Icon";

const CONTROL =
  "w-full rounded-lg border bg-white text-base sm:text-sm text-ink placeholder:text-faint " +
  "outline-none transition-colors focus:border-forest focus:ring-2 focus:ring-forest/15 " +
  "disabled:bg-sand disabled:text-muted";

function describedBy(id, hint, error) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

function FieldShell({ id, label, hint, error, required, children, className = "" }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block mb-1.5 text-sm font-medium text-ink">
          {label}
          {required && <span className="text-danger" aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="m-0 mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="m-0 mt-1 flex items-center gap-1 text-xs text-danger">
          <Icon name="alert" size={13} />
          {error}
        </p>
      )}
    </div>
  );
}

/* Text input. `icon` shows a leading icon; type="password" adds a show/hide toggle. */
export function TextField({ label, hint, error, icon, type = "text", required, className, inputClassName = "", ...rest }) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  const [isVisible, setIsVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <Icon name={icon} size={18} />
          </span>
        )}
        <input
          {...rest}
          id={id}
          type={isPassword && isVisible ? "text" : type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={`${CONTROL} h-11 ${icon ? "pl-11" : "pl-3.5"} ${isPassword ? "pr-11" : "pr-3.5"}
                      ${error ? "border-danger/60" : "border-line"} ${inputClassName}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setIsVisible((v) => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-md
                       bg-transparent border-0 text-muted hover:text-forest cursor-pointer
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
            aria-label={isVisible ? "Hide password" : "Show password"}
            aria-pressed={isVisible}
          >
            <Icon name={isVisible ? "eye-off" : "eye"} size={18} />
          </button>
        )}
      </div>
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, required, options, className, ...rest }) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        <select
          {...rest}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={`${CONTROL} h-11 pl-3.5 pr-9 appearance-none cursor-pointer ${error ? "border-danger/60" : "border-line"}`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <Icon name="chevron-down" size={16} />
        </span>
      </div>
    </FieldShell>
  );
}

export function TextArea({ label, hint, error, required, className, rows = 4, ...rest }) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        {...rest}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL} px-3.5 py-2.5 resize-y ${error ? "border-danger/60" : "border-line"}`}
      />
    </FieldShell>
  );
}

export function Checkbox({ label, className = "", ...rest }) {
  return (
    <label className={`inline-flex items-center gap-2.5 text-sm text-body cursor-pointer select-none ${className}`}>
      <input type="checkbox" {...rest} className="w-[18px] h-[18px] rounded accent-forest cursor-pointer" />
      {label}
    </label>
  );
}
