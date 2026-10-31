"use client";

import { useEffect, useState } from "react";
import { brandSerif } from "@/app/fonts";
import { fetchProductReviews } from "@/services/catalogApi";
import { useAuth } from "@/features/auth/AuthProvider";
import { TextArea, TextField } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { FormMessage, Skeleton } from "@/components/ui/States";
import { formatDate } from "@/lib/format";

export default function ProductReviews({ slug }) {
  const { user, authRequest } = useAuth();
  const [result, setResult] = useState({ status: "loading", reviews: [], summary: { average: 0, count: 0 }, error: null });
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProductReviews(slug, { signal: controller.signal })
      .then((data) => setResult({ status: "ready", ...data, error: null }))
      .catch((err) => {
        if (!controller.signal.aborted) setResult({ status: "error", reviews: [], summary: { average: 0, count: 0 }, error: err });
      });
    return () => controller.abort();
  }, [slug]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await authRequest(`/products/${encodeURIComponent(slug)}/reviews`, { method: "POST", body: { rating: Number(rating), title, body } });
      setMessage(data.review.message);
      setTitle("");
      setBody("");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="reviews-heading" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="m-0 text-xs font-medium uppercase tracking-[0.18em] text-sage-700">Customer feedback</p>
          <h2 id="reviews-heading" className={`${brandSerif.className} m-0 mt-1 text-2xl font-semibold text-heading`}>Reviews</h2>
        </div>
        {result.status === "ready" && <p className="m-0 text-sm text-muted" aria-label={`${result.summary.average.toFixed(1)} out of 5 from ${result.summary.count} reviews`}>{result.summary.average.toFixed(1)} / 5 · {result.summary.count} {result.summary.count === 1 ? "review" : "reviews"}</p>}
      </div>
      {result.status === "loading" ? <div className="mt-5 grid gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> : null}
      {result.status === "error" && <FormMessage tone="error" className="mt-4">{result.error.message}</FormMessage>}
      {result.status === "ready" && result.reviews.length === 0 && <p className="mt-4 text-sm text-muted">No approved reviews yet.</p>}
      {result.status === "ready" && result.reviews.length > 0 && (
        <ul className="m-0 mt-4 grid list-none gap-3 p-0">
          {result.reviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-line bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="m-0 text-sm font-semibold text-ink">{review.title || "Customer review"}</h3>
                <time className="text-xs text-muted" dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
              </div>
              <p className="m-0 mt-1 text-sm text-forest" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
              <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed text-body">{review.body}</p>
              <p className="m-0 mt-3 text-xs text-muted">{review.author}</p>
            </li>
          ))}
        </ul>
      )}
      {user?.role === "customer" && (
        <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl border border-line bg-[#f7f5ed] p-4 sm:p-6">
          <h3 className={`${brandSerif.className} m-0 text-xl font-semibold text-heading`}>Share your experience</h3>
          <p className="m-0 text-sm text-muted">Reviews are available after a delivered order containing this product and appear after moderation.</p>
          <label className="grid gap-1 text-sm font-medium text-ink" htmlFor="review-rating">
            Rating
            <select id="review-rating" value={rating} onChange={(event) => setRating(event.target.value)} className="h-11 rounded-lg border border-line bg-white px-3 text-base sm:text-sm">
              {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}
            </select>
          </label>
          <TextField label="Title (optional)" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} />
          <TextArea label="Your review" value={body} minLength={10} maxLength={2000} rows={4} required onChange={(event) => setBody(event.target.value)} />
          {message && <FormMessage tone="success">{message}</FormMessage>}
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <div><Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit review"}</Button></div>
        </form>
      )}
    </section>
  );
}
