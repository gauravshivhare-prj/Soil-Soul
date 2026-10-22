"use client";

/**
 * OrderStatusControl — change an order's status locally (demo).
 * The real update must happen on the server with admin authorization.
 */

import { useState } from "react";
import { ORDER_STATUSES } from "@/data/commerce";
import { OrderTimeline } from "@/features/orders/OrderParts";
import { StatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function OrderStatusControl({ orderId, initialStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [draft, setDraft] = useState(initialStatus);
  const { notify } = useToast();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Current status:</span>
        <StatusBadge status={status} />
      </div>
      <OrderTimeline status={status} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setStatus(draft);
          notify(`Order #${orderId} marked as ${draft} (demo)`);
        }}
        className="flex flex-wrap items-end gap-2.5"
      >
        <div>
          <label htmlFor="order-status" className="block mb-1.5 text-sm font-medium text-ink">Update status</label>
          <select
            id="order-status"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-10 rounded-lg border border-line bg-white px-3 text-sm capitalize cursor-pointer outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
          >
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <Button type="submit" disabled={draft === status}>Save Status</Button>
      </form>
    </div>
  );
}
