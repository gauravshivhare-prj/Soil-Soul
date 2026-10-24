"use client";

/**
 * AdminOrderDetail — one order for staff (GET /admin/orders/:id) with the actions the
 * API allows: advance or cancel the order (PATCH …/status), record COD collection or a
 * cash refund (PATCH …/payment) and retry stock restoration for a cancelled order
 * (POST …/reconcile-stock). The choices offered mirror the server's state machine,
 * which re-validates every change.
 */

import { useState } from "react";
import Link from "next/link";
import Card, { CardHeader } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { TextField } from "@/components/ui/Field";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { AdminHeader, Avatar } from "@/components/admin/AdminParts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import { DeliveryAddress, OrderItems, OrderTimeline, OrderTotals, PAYMENT_METHOD_LABEL, statusKey } from "@/features/orders/OrderParts";
import { formatDate, formatPrice } from "@/lib/format";

// Mirrors server/src/modules/orders/order.transitions.js (PERMITTED_ORDER_TRANSITIONS).
const NEXT_STATUSES = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
const RETRYABLE_RESTORATION = ["PENDING", "PARTIAL", "FAILED"];
const label = (s) => s[0] + s.slice(1).toLowerCase();

/** Runs one admin mutation and swaps in the returned order. */
function useOrderAction(order, onUpdated) {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  async function run(name, path, method, body, success) {
    setBusy(name);
    setError(null);
    try {
      const data = await authRequest(`/admin/orders/${encodeURIComponent(order.orderNumber)}${path}`, { method, body });
      onUpdated({ order: data.order });
      notify(success(data));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, run };
}

function StatusPanel({ order, onUpdated }) {
  const { busy, error, run } = useOrderAction(order, onUpdated);
  const options = NEXT_STATUSES[order.orderStatus] ?? [];
  const [next, setNext] = useState(options[0] ?? "");
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Current status:</span>
        <StatusBadge status={statusKey(order.orderStatus)} />
      </div>
      <OrderTimeline status={order.orderStatus} />
      {order.cancellation && (
        <p className="m-0 text-sm text-muted">
          Cancelled by {order.cancellation.actorRole ?? "—"}
          {order.cancellation.cancelledAt ? ` on ${formatDate(order.cancellation.cancelledAt)}` : ""}
          {order.cancellation.reason ? ` · ${order.cancellation.reason}` : ""}
        </p>
      )}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      {options.length > 0 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const body = { orderStatus: next, ...(next === "CANCELLED" && reason.trim() ? { reason: reason.trim() } : {}) };
            run("status", "/status", "PATCH", body, () => `Order #${order.orderNumber} is now ${label(next)}.`);
          }}
          className="flex flex-wrap items-end gap-2.5"
        >
          <div>
            <label htmlFor="order-status" className="block mb-1.5 text-sm font-medium text-ink">Move to</label>
            <select
              id="order-status"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="h-10 rounded-lg border border-line bg-white px-3 text-sm cursor-pointer outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
            >
              {options.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </div>
          {next === "CANCELLED" && (
            <TextField label="Cancellation reason (optional)" name="reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} className="min-w-[220px] flex-1" />
          )}
          <Button type="submit" variant={next === "CANCELLED" ? "danger" : "primary"} disabled={busy !== null || !next}>
            {busy === "status" ? "Saving…" : "Save Status"}
          </Button>
        </form>
      ) : (
        <p className="m-0 text-sm text-muted">This order is in a final state.</p>
      )}
    </div>
  );
}

function PaymentPanel({ order, onUpdated }) {
  const { busy, error, run } = useOrderAction(order, onUpdated);
  const refundable = Math.round((order.total - (order.totalRefunded ?? 0)) * 100) / 100;
  const [amount, setAmount] = useState(String(refundable));
  const [reason, setReason] = useState("");
  const canCollect = order.paymentMethod === "COD" && order.paymentStatus === "PENDING" && order.orderStatus === "DELIVERED";
  const canRefund = ["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus) && refundable > 0;
  const restoration = order.cancellation?.stockRestorationStatus;

  function refund(e) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    const full = Math.round(value * 100) / 100 >= refundable;
    run(
      "refund",
      "/payment",
      "PATCH",
      { paymentStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED", amount: Math.round(value * 100) / 100, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      () => `Refund of ${formatPrice(value)} recorded.`
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
        <StatusBadge status={statusKey(order.paymentStatus)} />
      </div>
      {order.paymentDetails?.collectedAt && <p className="m-0 text-sm text-muted">Collected on {formatDate(order.paymentDetails.collectedAt)}</p>}
      {(order.refunds ?? []).length > 0 && (
        <ul className="list-none m-0 p-0 grid gap-1 text-sm text-muted">
          {order.refunds.map((r, i) => (
            <li key={i}>Refunded {formatPrice(r.amount)}{r.refundedAt ? ` on ${formatDate(r.refundedAt)}` : ""}{r.reason ? ` · ${r.reason}` : ""}</li>
          ))}
        </ul>
      )}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      {canCollect && (
        <Button disabled={busy !== null} onClick={() => run("paid", "/payment", "PATCH", { paymentStatus: "PAID" }, () => "Payment marked as collected.")}>
          <Icon name="cash" size={16} /> {busy === "paid" ? "Saving…" : "Mark Cash Collected"}
        </Button>
      )}
      {canRefund && (
        <form onSubmit={refund} className="grid gap-3">
          <TextField label={`Refund amount (up to ${formatPrice(refundable)})`} name="amount" type="number" min="0.01" step="0.01" max={refundable} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <TextField label="Reason (optional)" name="refund-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          <div><Button type="submit" variant="outline" disabled={busy !== null}>{busy === "refund" ? "Saving…" : "Record Cash Refund"}</Button></div>
        </form>
      )}
      {order.orderStatus === "CANCELLED" && RETRYABLE_RESTORATION.includes(restoration) && (
        <div className="grid gap-2">
          <FormMessage tone="error">Stock restoration for this cancelled order is {restoration.toLowerCase()}.</FormMessage>
          <div>
            <Button variant="outline" disabled={busy !== null} onClick={() => run("reconcile", "/reconcile-stock", "POST", undefined, (d) => d.message ?? "Stock reconciled.")}>
              <Icon name="refresh" size={16} /> {busy === "reconcile" ? "Retrying…" : "Retry Stock Restoration"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrderDetail({ orderId }) {
  const { status, data, error, replace } = useAuthedResource(`/admin/orders/${encodeURIComponent(orderId)}`);

  if (status === "loading") {
    return (
      <div className="space-y-5" role="status" aria-label="Loading order">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (status === "error") {
    return error.status === 404 ? (
      <EmptyState icon="bag" title="Order not found" action={<Button href="/admin/orders">Back to Orders</Button>} />
    ) : (
      <FormMessage tone="error">{error.message}</FormMessage>
    );
  }

  const { order } = data;
  const customer = order.user ?? null;
  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 mb-2 text-sm text-muted no-underline hover:text-forest">
        <Icon name="arrow-left" size={15} /> Back to orders
      </Link>
      <AdminHeader title={`Order #${order.orderNumber}`} subtitle={`Placed on ${formatDate(order.createdAt)}`} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px] items-start">
        <div className="grid grid-cols-1 gap-5 min-w-0">
          <Card>
            <CardHeader title="Status" />
            <StatusPanel key={order.orderStatus} order={order} onUpdated={replace} />
          </Card>
          <Card>
            <CardHeader title="Items" />
            <OrderItems items={order.items} />
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader title="Customer" />
            {customer ? (
              <div className="flex items-center gap-3">
                <Avatar name={customer.name ?? "?"} />
                <div className="min-w-0 text-sm">
                  <p className="m-0 font-semibold text-ink">{customer.name}</p>
                  <p className="m-0 text-muted truncate">{customer.email}</p>
                </div>
              </div>
            ) : (
              <p className="m-0 text-sm text-muted">Customer account no longer exists.</p>
            )}
          </Card>
          <Card>
            <CardHeader title="Delivery Address" />
            <DeliveryAddress address={order.deliveryAddress} />
          </Card>
          <Card>
            <CardHeader title="Payment" />
            <OrderTotals order={order} />
            <div className="mt-4 pt-4 border-t border-line">
              <PaymentPanel key={`${order.paymentStatus}-${order.totalRefunded ?? 0}`} order={order} onUpdated={replace} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
