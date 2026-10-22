/**
 * Lightweight SVG charts for the admin demo (no chart library).
 *
 * BarChart — vertical bars with a y-axis; values are also exposed as an
 *   accessible table (sr-only) so screen readers get the numbers.
 * DonutChart — segments with a centre label and a legend.
 */

import { formatNumber } from "@/lib/format";

export function BarChart({ data, valueKey, labelKey, height = 220, formatValue = (v) => v, highlightLast = true, label }) {
  const max = Math.max(...data.map((d) => d[valueKey]));
  const top = Math.ceil(max / 4000) * 4000 || 1;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(top * t));

  return (
    <figure className="m-0">
      <div className="flex gap-2" style={{ height }} aria-hidden="true">
        <div className="flex flex-col-reverse justify-between pb-6 text-[0.6875rem] text-muted text-right w-9 flex-shrink-0">
          {ticks.map((t) => <span key={t}>{t >= 1000 ? `${Math.round(t / 100) / 10}K` : t}</span>)}
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((t) => <span key={t} className="border-t border-line" />)}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end justify-around gap-[3%] px-[2%]">
            {data.map((d, i) => {
              const isLast = i === data.length - 1;
              return (
                <div
                  key={d[labelKey]}
                  title={`${d[labelKey]}: ${formatValue(d[valueKey])}`}
                  className={`flex-1 max-w-12 rounded-t-md ${highlightLast && isLast ? "bg-forest" : i % 2 ? "bg-[#9fbf8c]" : "bg-sage-300"}`}
                  style={{ height: `${(d[valueKey] / top) * 100}%` }}
                />
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-5 flex justify-around px-[2%] text-[0.625rem] sm:text-[0.6875rem] text-muted">
            {data.map((d) => <span key={d[labelKey]} className="flex-1 text-center truncate">{d[labelKey]}</span>)}
          </div>
        </div>
      </div>
      <div className="sr-only">
      <table>
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d[labelKey]}>
              <th scope="row">{d[labelKey]}</th>
              <td>{formatValue(d[valueKey])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

export function DonutChart({ segments, centerValue, centerLabel, size = 150 }) {
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  const r = 15.9155; // circumference = 100
  // Each segment starts where the previous one ended (12 o'clock first).
  const arcs = segments.map((s, i) => {
    const before = segments.slice(0, i).reduce((n, x) => n + x.value, 0);
    return { ...s, pct: (s.value / total) * 100, offset: 25 - (before / total) * 100 };
  });

  return (
    <div className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 42 42" width={size} height={size} aria-hidden="true" focusable="false">
          <circle cx="21" cy="21" r={r} fill="none" stroke="#f4efe4" strokeWidth="6" />
          {arcs.map((s) => (
            <circle
              key={s.label}
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="6"
              strokeDasharray={`${s.pct} ${100 - s.pct}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-ink">{formatNumber(centerValue)}</span>
          <span className="text-xs text-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="list-none m-0 p-0 w-full grid gap-2 text-[0.8125rem]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} aria-hidden="true" />
            <span className="flex-1 text-ink">{s.label}</span>
            <span className="text-muted whitespace-nowrap">
              {s.value} ({Math.round((s.value / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
