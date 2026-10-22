"use client";

/**
 * ReviewsModeration — approve / hide reviews locally (demo).
 */

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Stars from "@/components/ui/Stars";
import { StatusBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/format";
import { productHref } from "@/lib/routes";

export default function ReviewsModeration({ initialReviews }) {
  const [reviews, setReviews] = useState(initialReviews);
  const { notify } = useToast();

  function setStatus(id, status) {
    setReviews((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    notify(`Review ${status === "approved" ? "approved" : "hidden"} (demo)`);
  }

  return (
    <Card as="ul" className="list-none m-0 divide-y divide-line">
      {reviews.map((r) => (
        <li key={r.id} className="py-4 first:pt-0 last:pb-0 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars rating={r.rating} showValue={false} size={13} />
              <Link href={productHref(r.slug)} className="text-sm font-semibold text-ink no-underline hover:text-forest">{r.product.name}</Link>
              <StatusBadge status={r.status} />
            </div>
            <p className="m-0 mt-1.5 text-sm text-body">“{r.text}”</p>
            <p className="m-0 mt-1 text-xs text-muted">{r.customer.name} · {formatDate(r.date)}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={r.status === "approved"} onClick={() => setStatus(r.id, "approved")}>Approve</Button>
            <Button size="sm" variant="ghost" disabled={r.status === "hidden"} onClick={() => setStatus(r.id, "hidden")}>Hide</Button>
          </div>
        </li>
      ))}
    </Card>
  );
}
