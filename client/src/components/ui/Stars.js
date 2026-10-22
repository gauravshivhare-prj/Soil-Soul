/**
 * Stars — five-star rating with partial fill, plus optional "4.5 (126)" text.
 * The visual stars are hidden from screen readers; the text is announced.
 */

const STAR =
  "M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z";

function Row({ size, className }) {
  return (
    <span className={`flex gap-px ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" focusable="false" className="flex-shrink-0">
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}

export default function Stars({ rating, count, size = 12, showValue = true, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative inline-flex" aria-hidden="true">
        <Row size={size} className="text-[#e3ddd0]" />
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${(rating / 5) * 100}%` }}>
          <Row size={size} className="text-gold" />
        </span>
      </span>
      {showValue ? (
        <span className="text-[0.6875rem] sm:text-xs text-faint">
          <span className="sr-only">Rated </span>
          {rating.toFixed(1)}
          <span className="sr-only"> out of 5</span>
          {count != null && (
            <>
              {" "}({count}
              <span className="sr-only"> reviews</span>)
            </>
          )}
        </span>
      ) : (
        <span className="sr-only">Rated {rating.toFixed(1)} out of 5</span>
      )}
    </span>
  );
}
