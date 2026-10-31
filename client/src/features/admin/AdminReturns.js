"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { AdminHeader } from "@/components/admin/AdminParts";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { formatDate, formatPrice } from "@/lib/format";

export default function AdminReturns() {
  const { authRequest } = useAuth();
  const [state, setState] = useState({ status: "loading", returns: [], error: null });
  const [busyId, setBusyId] = useState(null);
  const load = useCallback(async (signal) => {
    try {
      const data = await authRequest("/admin/returns?status=REQUESTED&limit=100", { signal });
      if (!signal.aborted) setState({ status: "ready", returns: data.returns, error: null });
    } catch (error) { if (!signal.aborted) setState({ status: "error", returns: [], error }); }
  }, [authRequest]);
  useEffect(() => {
    const controller = new AbortController(); load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function action(entry, path, method, body) {
    setBusyId(entry._id);
    try {
      const data = await authRequest(`/admin/returns/${entry._id}${path}`, { method, body });
      setState((previous) => ({ ...previous, returns: previous.returns.map((item) => item._id === entry._id ? data.returnRequest : item) }));
    } catch (error) { setState((previous) => ({ ...previous, error })); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <AdminHeader title="Return requests" subtitle="Review requests separately from order status. Approval does not issue a refund or restock inventory." />
      {state.error && <FormMessage tone="error">{state.error.message}</FormMessage>}
      {state.status === "loading" && <Skeleton className="h-36" />}
      {state.status === "ready" && state.returns.length === 0 && <Card><EmptyState icon="box" title="No return requests" description="Customer requests will appear here for review." /></Card>}
      {state.status === "ready" && state.returns.length > 0 && <ul className="m-0 grid list-none gap-3 p-0">{state.returns.map((entry) => <li key={entry._id}><Card>
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="m-0 text-base font-semibold text-ink">{entry.productName} × {entry.quantity}</h2><p className="m-0 mt-1 text-sm text-muted">Order {entry.order?.orderNumber} · {entry.user?.name} ({entry.user?.email}) · {formatDate(entry.createdAt)}</p></div><strong>{formatPrice(entry.amount)} gross pre-discount item value</strong></div>
        <p className="m-0 mt-1 text-xs text-muted">This is not a refund quote. Per-line discount allocation needs a store policy.</p>
        <p className="m-0 mt-3 whitespace-pre-wrap text-sm text-body">{entry.reason}</p>
        <ol className="m-0 mt-3 grid list-none gap-1 border-t border-line pt-3 pl-0 text-xs text-muted">{entry.statusHistory.map((event, index) => <li key={`${event.changedAt}-${index}`}>{event.fromStatus ? `${event.fromStatus} → ` : ""}{event.toStatus} · {formatDate(event.changedAt)}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ol>
        <div className="mt-4 flex flex-wrap gap-2">
          {entry.status === "REQUESTED" && <><Button size="sm" disabled={busyId === entry._id} onClick={() => action(entry, "", "PATCH", { status: "APPROVED" })}>Approve</Button><Button size="sm" variant="outline" disabled={busyId === entry._id} onClick={() => action(entry, "", "PATCH", { status: "REJECTED" })}>Reject</Button></>}
          {entry.status === "APPROVED" && <Button size="sm" variant="outline" disabled={busyId === entry._id} onClick={() => action(entry, "", "PATCH", { status: "RECEIVED", reason: "Return received and inspected" })}>Mark received</Button>}
          {entry.status === "RECEIVED" && entry.refundStatus === "PENDING" && entry.order?.paymentMethod === "COD" && <Button size="sm" variant="outline" disabled={busyId === entry._id} onClick={() => action(entry, "/record-refund", "POST", { note: "COD refund recorded in store ledger; no transfer made by this system." })}>Record COD refund bookkeeping</Button>}
        </div>
        <p className="m-0 mt-2 text-xs text-muted">Refund status: {entry.refundStatus}. Recording this status is bookkeeping only and confirms no money transfer.</p>
      </Card></li>)}</ul>}
    </div>
  );
}
