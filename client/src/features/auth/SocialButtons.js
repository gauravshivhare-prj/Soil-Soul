"use client";

/**
 * Social sign-in buttons — visual only. No OAuth is wired up; clicking
 * explains that social sign-in isn't available in the demo.
 */

import { useToast } from "@/components/ui/Toast";

const PROVIDERS = [
  { id: "google", label: "Google", mark: <span className="text-[1.05rem] font-bold text-[#4285f4]">G</span> },
  { id: "facebook", label: "Facebook", mark: <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#1877f2] text-white text-xs font-bold">f</span> },
  {
    id: "apple",
    label: "Apple",
    mark: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1ZM13.9 5.2c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.1.1 2.3-.6 3-1.5Z" />
      </svg>
    ),
  },
];

export default function SocialButtons() {
  const { notify } = useToast();
  return (
    <div>
      <div className="flex items-center gap-3 my-6 text-xs text-muted" aria-hidden="true">
        <span className="flex-1 h-px bg-line" />
        or continue with
        <span className="flex-1 h-px bg-line" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => notify(`${p.label} sign-in isn't available in this demo yet.`, { tone: "error" })}
            className="inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-line bg-white text-sm text-ink cursor-pointer
                       hover:border-forest/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          >
            {p.mark}
            <span className="hidden sm:inline">{p.label}</span>
            <span className="sm:hidden sr-only">Continue with {p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
