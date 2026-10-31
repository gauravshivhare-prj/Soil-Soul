"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { AdminHeader } from "@/components/admin/AdminParts";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { formatDate } from "@/lib/format";

export default function AdminReviews() {
  const { authRequest } = useAuth();
  const [state, setState] = useState({ status: "loading", reviews: [], error: null });
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (signal) => {
    try {
      const data = await authRequest("/admin/reviews?status=PENDING&limit=100", { signal });
      if (!signal.aborted) setState({ status: "ready", reviews: data.reviews, error: null });
    } catch (error) {
      if (!signal.aborted) setState({ status: "error", reviews: [], error });
    }
  }, [authRequest]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function moderate(review, status) {
    setBusyId(review._id);
    try {
      await authRequest(`/admin/reviews/${encodeURIComponent(review._id)}`, { method: "PATCH", body: { status } });
      setState((previous) => ({ ...previous, reviews: previous.reviews.filter((item) => item._id !== review._id) }));
    } catch (error) {
      setState((previous) => ({ ...previous, error }));
    } finally { setBusyId(null); }
  }

  return (
    <div>
      <AdminHeader title="Reviews" subtitle="Approve, reject or hide customer-submitted reviews." />
      {state.status === "error" && <FormMessage tone="error">{state.error.message}</FormMessage>}
      {state.status === "loading" && <div className="grid gap-3"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>}
      {state.status === "ready" && state.reviews.length === 0 && <Card><EmptyState icon="star" title="No reviews awaiting moderation" description="New reviews from eligible delivered orders will appear here." /></Card>}
      {state.status === "ready" && state.reviews.length > 0 && (
        <ul className="m-0 grid list-none gap-3 p-0">
          {state.reviews.map((review) => (
            <li key={review._id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/products/${encodeURIComponent(review.product?.slug ?? "")}`} className="text-sm font-semibold text-forest">{review.product?.name ?? "Product"}</Link>
                    <p className="m-0 mt-1 text-xs text-muted">{review.user?.name ?? "Customer"} · {review.user?.email ?? ""} · {formatDate(review.createdAt)}</p>
                  </div>
                  <span className="text-sm text-forest" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                </div>
                {review.title && <h2 className="m-0 mt-3 text-base font-semibold text-ink">{review.title}</h2>}
                <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed text-body">{review.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" disabled={busyId === review._id} onClick={() => moderate(review, "APPROVED")}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={busyId === review._id} onClick={() => moderate(review, "REJECTED")}>Reject</Button>
                  <Button size="sm" variant="outline" disabled={busyId === review._id} onClick={() => moderate(review, "HIDDEN")}>Hide</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
