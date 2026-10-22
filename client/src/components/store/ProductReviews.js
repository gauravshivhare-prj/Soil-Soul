/**
 * ReviewSummary — average rating with a 5→1 star distribution.
 * ReviewList — sample reviews (demo content until reviews come from the API).
 */

import { brandSerif } from "@/app/fonts";
import Stars from "@/components/ui/Stars";
import { formatDate } from "@/lib/format";

export function ReviewSummary({ summary }) {
  return (
    <div className="flex items-center gap-5 sm:gap-7">
      <div className="flex-shrink-0 text-center">
        <p className={`${brandSerif.className} m-0 text-[2.6rem] leading-none font-bold text-ink`}>{summary.average.toFixed(1)}</p>
        <Stars rating={summary.average} size={15} showValue={false} className="mt-2" />
        <p className="m-0 mt-1.5 text-xs text-muted">Based on {summary.count} reviews</p>
      </div>
      <ul className="list-none m-0 p-0 flex-1 space-y-1.5" aria-label="Rating distribution">
        {summary.distribution.map((d) => (
          <li key={d.stars} className="flex items-center gap-2 text-xs text-muted">
            <span className="w-7 flex-shrink-0">{d.stars} ★</span>
            <span className="flex-1 h-1.5 rounded-full bg-sand overflow-hidden" aria-hidden="true">
              <span className="block h-full rounded-full bg-forest" style={{ width: `${d.percent}%` }} />
            </span>
            <span className="w-9 text-right">{d.percent}%</span>
            <span className="sr-only">of reviews give {d.stars} stars</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewList({ reviews }) {
  return (
    <div>
      <p className="m-0 mb-3 text-xs text-muted">Sample reviews shown for demonstration.</p>
      <ul className="list-none m-0 p-0 divide-y divide-line">
        {reviews.map((r) => (
          <li key={r.id} className="py-4 first:pt-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars rating={r.rating} showValue={false} size={13} />
              <span className="text-sm font-semibold text-ink">{r.title}</span>
            </div>
            <p className="m-0 mt-1.5 text-sm leading-relaxed text-body">{r.body}</p>
            <p className="m-0 mt-1.5 text-xs text-faint">
              {r.author} · {formatDate(r.date)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
