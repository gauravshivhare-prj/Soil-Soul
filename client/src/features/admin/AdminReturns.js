"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { AdminHeader } from "@/components/admin/AdminParts";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";

const TABS = [
  { id: "ALL", label: "All Returns" },
  { id: "REQUESTED", label: "Under Review" },
  { id: "APPROVED", label: "Approved" },
  { id: "RECEIVED", label: "Received & Inspected" },
  { id: "REJECTED", label: "Rejected" },
];

const STATUS_BADGE = {
  REQUESTED: { label: "Under Review", variant: "warning", color: "bg-amber-100 text-amber-800 border-amber-200" },
  APPROVED: { label: "Approved", variant: "info", color: "bg-blue-100 text-blue-800 border-blue-200" },
  RECEIVED: { label: "Received & Inspected", variant: "success", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  REJECTED: { label: "Rejected", variant: "danger", color: "bg-rose-100 text-rose-800 border-rose-200" },
};

export default function AdminReturns() {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const [state, setState] = useState({ status: "loading", returns: [], counts: {}, error: null });
  const [currentTab, setCurrentTab] = useState("ALL");
  const [busyId, setBusyId] = useState(null);
  const [refundDialog, setRefundDialog] = useState(null); // { entry, note }
  const [rejectDialog, setRejectDialog] = useState(null); // { entry, reason }

  const load = useCallback(async (signal) => {
    try {
      const queryParam = currentTab === "ALL" ? "" : `status=${currentTab}&`;
      const data = await authRequest(`/admin/returns?${queryParam}limit=100`, { signal });
      if (!signal.aborted) {
        setState({
          status: "ready",
          returns: data.returns || [],
          counts: data.counts || {},
          error: null,
        });
      }
    } catch (error) {
      if (!signal.aborted) setState((prev) => ({ ...prev, status: "error", error }));
    }
  }, [authRequest, currentTab]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function action(entry, path, method, body, successMsg) {
    setBusyId(entry._id);
    try {
      const data = await authRequest(`/admin/returns/${entry._id}${path}`, { method, body });
      const updated = data.returnRequest;
      setState((prev) => ({
        ...prev,
        returns: prev.returns.map((item) => (item._id === entry._id ? { ...item, ...updated } : item)),
      }));
      if (successMsg) notify(successMsg);
    } catch (error) {
      setState((prev) => ({ ...prev, error }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmRefund(e) {
    e.preventDefault();
    if (!refundDialog?.entry) return;
    const entry = refundDialog.entry;
    const defaultNote = `Refund of ₹${entry.amount} recorded${entry.upiId ? ` via UPI to ${entry.upiId}` : ""}.`;
    const note = (refundDialog.note || defaultNote).trim();
    await action(entry, "/record-refund", "POST", { note }, `Refund of ₹${entry.amount} recorded successfully.`);
    setRefundDialog(null);
  }

  async function handleConfirmReject(e) {
    e.preventDefault();
    if (!rejectDialog?.entry) return;
    const entry = rejectDialog.entry;
    const note = (rejectDialog.reason || "Return request could not be accepted.").trim();
    await action(entry, "", "PATCH", { status: "REJECTED", reason: note }, "Return request marked as rejected.");
    setRejectDialog(null);
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Return & Exchange Requests"
        subtitle="Review customer requests, track physical package arrivals, and record refunds."
      />

      {state.error && <FormMessage tone="error">{state.error.message}</FormMessage>}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-line">
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          const count = state.counts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-forest text-cream shadow-xs"
                  : "text-muted hover:text-ink hover:bg-sand/40"
              }`}
            >
              <span>{tab.label}</span>
              {typeof count === "number" && (
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-cream/20 text-cream" : "bg-sand text-muted"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {state.status === "loading" && (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}

      {state.status === "ready" && state.returns.length === 0 && (
        <Card>
          <EmptyState
            icon="box"
            title={`No ${currentTab === "ALL" ? "" : currentTab.toLowerCase()} return requests`}
            description={
              currentTab === "ALL"
                ? "Customer return and exchange requests will appear here once submitted."
                : `There are currently no return requests with status ${currentTab}.`
            }
          />
        </Card>
      )}

      {state.status === "ready" && state.returns.length > 0 && (
        <ul className="m-0 grid list-none gap-4 p-0">
          {state.returns.map((entry) => {
            const isExchange = entry.reason?.includes("EXCHANGE");
            const badgeMeta = STATUS_BADGE[entry.status] || { label: entry.status, color: "bg-sand text-muted" };

            return (
              <li key={entry._id}>
                <Card className="space-y-4">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="m-0 text-base font-bold text-ink">
                          {entry.productName} × {entry.quantity}
                        </h2>
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeMeta.color}`}>
                          {badgeMeta.label}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {isExchange ? "Exchange" : "Return for Refund"}
                        </Badge>
                      </div>
                      <p className="m-0 mt-1 text-xs text-muted flex items-center gap-2 flex-wrap">
                        <span>
                          Order{" "}
                          {entry.order?.orderNumber ? (
                            <Link
                              href={`/admin/orders/${entry.order.orderNumber}`}
                              className="font-bold text-forest underline hover:text-leaf"
                            >
                              #{entry.order.orderNumber}
                            </Link>
                          ) : (
                            "N/A"
                          )}
                        </span>
                        <span>·</span>
                        <span>
                          Customer: <strong className="text-ink">{entry.user?.name || "Customer"}</strong> ({entry.user?.email})
                        </span>
                        <span>·</span>
                        <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-ink">{formatPrice(entry.amount)}</div>
                      <span className="text-[11px] text-muted">Item Gross Value</span>
                    </div>
                  </div>

                  {/* Customer UPI for Refund Highlight */}
                  {entry.upiId && !isExchange && (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">💳</span>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                            Customer Refund UPI ID
                          </span>
                          <strong className="font-mono text-sm font-bold text-forest select-all">
                            {entry.upiId}
                          </strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== "undefined" && navigator.clipboard) {
                            navigator.clipboard.writeText(entry.upiId);
                            notify(`UPI ID copied: ${entry.upiId}`);
                          }
                        }}
                        className="text-xs font-semibold text-forest hover:bg-emerald-100 bg-white border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      >
                        Copy UPI ID
                      </button>
                    </div>
                  )}

                  {/* Customer's Reason */}
                  <div className="rounded-xl bg-sand/30 border border-line/60 p-3 text-xs">
                    <span className="text-muted block text-[10px] uppercase font-semibold mb-0.5">
                      Customer Reason
                    </span>
                    <p className="m-0 text-sm text-body whitespace-pre-wrap">{entry.reason}</p>
                  </div>

                  {/* Refund Status */}
                  {!isExchange && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted font-medium">Refund Status:</span>
                        {entry.refundStatus === "RECORDED" ? (
                          <span className="font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Icon name="check" size={13} />
                            Refund Completed ({formatPrice(entry.amount)})
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            Pending Payment Transfer
                          </span>
                        )}
                      </div>
                      {entry.refundRecordedAt && (
                        <span className="text-muted text-[11px]">
                          Processed on {formatDate(entry.refundRecordedAt)}
                        </span>
                      )}
                    </div>
                  )}

                  {entry.refundNote && (
                    <div className="text-[11px] text-muted italic bg-sand/20 px-3 py-1.5 rounded-lg">
                      Bookkeeping note: {entry.refundNote}
                    </div>
                  )}

                  {/* Status History (Normal text timestamps) */}
                  {entry.statusHistory?.length > 0 && (
                    <div className="border-t border-line/50 pt-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted tracking-wider block mb-1">
                        Status History
                      </span>
                      <ol className="m-0 grid list-none gap-1 pl-0 text-xs text-muted">
                        {entry.statusHistory.map((event, index) => (
                          <li key={`${event.changedAt}-${index}`} className="flex items-center justify-between py-0.5">
                            <span>
                              {event.fromStatus ? `${event.fromStatus} → ` : ""}
                              <strong className="text-ink">{event.toStatus}</strong>
                              {event.reason ? ` · ${event.reason}` : ""}
                            </span>
                            <time dateTime={event.changedAt} className="text-[11px]">
                              {formatDateTime(event.changedAt)}
                            </time>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Actions for REQUESTED */}
                      {entry.status === "REQUESTED" && (
                        <>
                          <Button
                            size="sm"
                            disabled={busyId === entry._id}
                            onClick={() =>
                              action(
                                entry,
                                "",
                                "PATCH",
                                { status: "APPROVED", reason: "Return authorized for pickup" },
                                "Return request approved."
                              )
                            }
                          >
                            <Icon name="check" size={14} /> Approve Return
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="!text-danger !border-danger/30 hover:!bg-danger/10"
                            disabled={busyId === entry._id}
                            onClick={() => setRejectDialog({ entry, reason: "" })}
                          >
                            <Icon name="x-circle" size={14} /> Reject
                          </Button>
                        </>
                      )}

                      {/* Actions for APPROVED */}
                      {entry.status === "APPROVED" && (
                        <Button
                          size="sm"
                          disabled={busyId === entry._id}
                          onClick={() =>
                            action(
                              entry,
                              "",
                              "PATCH",
                              { status: "RECEIVED", reason: "Return package received and verified at store" },
                              "Marked as Received & Inspected."
                            )
                          }
                        >
                          <Icon name="box" size={14} /> Mark as Received &amp; Inspected
                        </Button>
                      )}

                      {/* Refund Trigger for RECEIVED / APPROVED with PENDING refund */}
                      {["APPROVED", "RECEIVED"].includes(entry.status) &&
                        entry.refundStatus === "PENDING" &&
                        !isExchange && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === entry._id}
                            onClick={() =>
                              setRefundDialog({
                                entry,
                                note: `Refund of ₹${entry.amount} sent via UPI to ${entry.upiId || "customer"}.`,
                              })
                            }
                          >
                            💸 Record Refund Processed ({formatPrice(entry.amount)})
                          </Button>
                        )}
                    </div>

                    <span className="text-[11px] text-muted">ID: {entry._id}</span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* Record Refund Modal */}
      {refundDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setRefundDialog(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-line p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="m-0 text-base font-bold text-ink">Record Refund Payment</h3>
              <button
                type="button"
                onClick={() => setRefundDialog(null)}
                className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-sage-50 border border-sage-200 p-3 space-y-1 text-xs">
              <div className="flex justify-between font-semibold text-ink">
                <span>Product:</span>
                <span>{refundDialog.entry.productName} × {refundDialog.entry.quantity}</span>
              </div>
              <div className="flex justify-between font-bold text-forest text-sm pt-1 border-t border-sage-200/60">
                <span>Refund Amount:</span>
                <span>{formatPrice(refundDialog.entry.amount)}</span>
              </div>
              {refundDialog.entry.upiId && (
                <div className="flex justify-between text-ink pt-1 font-mono">
                  <span>Customer UPI ID:</span>
                  <span className="font-bold">{refundDialog.entry.upiId}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmRefund} className="space-y-4">
              <div>
                <label htmlFor="refund-note-input" className="block text-xs font-semibold text-ink mb-1.5">
                  Refund Reference / Bookkeeping Note <span className="text-danger">*</span>
                </label>
                <input
                  id="refund-note-input"
                  type="text"
                  value={refundDialog.note}
                  onChange={(e) => setRefundDialog({ ...refundDialog, note: e.target.value })}
                  placeholder="e.g. Sent ₹179 to UPI gaurav@okaxis · UTR 4291048123"
                  className="w-full h-10 rounded-lg border border-line px-3 text-xs text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                  required
                  minLength={3}
                />
                <p className="m-0 mt-1 text-[11px] text-muted">
                  This marks the refund as completed in Soil &amp; Soul records and shows on the customer order page.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="outline" size="sm" onClick={() => setRefundDialog(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Confirm Refund Processed
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setRejectDialog(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-line p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="m-0 text-base font-bold text-danger">Reject Return Request</h3>
              <button
                type="button"
                onClick={() => setRejectDialog(null)}
                className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="m-0 text-xs text-muted">
              Rejecting will mark {refundDialog?.entry?.productName || "this item"} as non-returnable. Please provide a brief reason for the customer.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label htmlFor="reject-reason-input" className="block text-xs font-semibold text-ink mb-1.5">
                  Reason for rejection <span className="text-danger">*</span>
                </label>
                <textarea
                  id="reject-reason-input"
                  value={rejectDialog.reason}
                  onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                  placeholder="e.g. Return requested after transit window or item reported healthy"
                  className="w-full h-20 rounded-lg border border-line p-2 text-xs text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                  required
                  minLength={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="outline" size="sm" onClick={() => setRejectDialog(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="danger">
                  Confirm Reject
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
