"use client";

/**
 * AccountOrderDetail — one of the signed-in customer's orders (GET /orders/:id, by order
 * number or id). Orders that are still Placed or Confirmed can be cancelled here
 * (POST /orders/:id/cancel); the server re-checks ownership and the status rule.
 */

import { useState } from "react";
import Link from "next/link";
import Card, { CardHeader } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { SectionTitle } from "@/components/ui/PageHeader";
import { TextArea } from "@/components/ui/Field";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import {
  DeliveryAddress,
  OrderItems,
  OrderTimeline,
  OrderTotals,
  PAYMENT_METHOD_LABEL,
  canCustomerCancel,
  statusKey,
} from "@/features/orders/OrderParts";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import ReturnRequests from "@/features/account/ReturnRequests";

function CancelOrder({ order, onCancelled }) {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  async function confirm() {
    setIsBusy(true);
    setError(null);
    try {
      const data = await authRequest(`/orders/${encodeURIComponent(order.orderNumber)}/cancel`, {
        method: "POST",
        body: reason.trim() ? { reason: reason.trim() } : {},
      });
      notify("Your order was cancelled.");
      onCancelled(data);
    } catch (err) {
      setError(err.message);
      setIsBusy(false);
    }
  }

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Icon name="x-circle" size={16} /> Cancel Order
      </Button>
    );
  }
  return (
    <Card>
      <CardHeader title="Cancel this order?" />
      <div className="grid gap-4">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <TextArea label="Reason (optional)" name="reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex flex-wrap gap-3">
          <Button variant="danger" onClick={confirm} disabled={isBusy}>{isBusy ? "Cancelling…" : "Yes, Cancel Order"}</Button>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isBusy}>Keep Order</Button>
        </div>
      </div>
    </Card>
  );
}

export default function AccountOrderDetail({ orderId }) {
  const { status, data, error, replace } = useAuthedResource(`/orders/${encodeURIComponent(orderId)}`);

  if (status === "loading") {
    return (
      <div className="space-y-5" role="status" aria-label="Loading order">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (status === "error") {
    return error.status === 404 || error.status === 400 ? (
      <EmptyState icon="box" title="Order not found" description="We couldn't find this order in your account." action={<Button href="/account/orders">Back to My Orders</Button>} />
    ) : (
      <FormMessage tone="error">{error.message}</FormMessage>
    );
  }

  const { order } = data;
  const placedDate = new Date(order.createdAt || 0);
  const estDate = new Date(placedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const estDeliveryFormatted = estDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div>
        <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm text-muted no-underline hover:text-forest">
          <Icon name="arrow-left" size={15} /> Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <SectionTitle as="h1">Order #{order.orderNumber}</SectionTitle>
          <StatusBadge status={statusKey(order.orderStatus)} />
        </div>
        <p className="m-0 mt-1 text-sm text-muted">
          Placed on <strong className="text-ink">{formatDateTime(order.createdAt)}</strong> · {PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
        </p>

        {order.orderStatus !== "CANCELLED" && order.orderStatus !== "DELIVERED" && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-sage-50 border border-sage-200 px-4 py-2 text-xs sm:text-sm text-forest">
            <span aria-hidden="true">🚚</span>
            <span>
              <strong>Estimated Delivery:</strong> {estDeliveryFormatted} (Within 7 days)
            </span>
          </div>
        )}

        {order.totalRefunded > 0 && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-2.5 text-xs sm:text-sm text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">💸</span>
              <span>
                <strong>Refund Issued:</strong> {formatPrice(order.totalRefunded)} has been credited to your account for this order.
              </span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-950">
              {order.paymentStatus === "REFUNDED" ? "Fully Refunded" : "Partially Refunded"}
            </span>
          </div>
        )}
      </div>

      <Card>
        <OrderTimeline status={order.orderStatus} history={order.statusHistory} />
        {order.cancellation?.reason && <p className="m-0 mt-3 text-sm text-muted">Reason: {order.cancellation.reason}</p>}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px] items-start">
        <div className="space-y-5 min-w-0">
          <Card>
            <CardHeader
              title={`Ordered Items (${order.items.reduce((sum, item) => sum + item.quantity, 0)})`}
            />
            <OrderItems items={order.items} />
          </Card>

          {order.orderStatus !== "CANCELLED" && <ReturnRequests order={order} />}

          {/* Plant Care & Support Card */}
          <div className="rounded-2xl border border-line bg-gradient-to-br from-[#faf8f2] via-cream to-sage-50/60 p-5 space-y-3 shadow-[0_1px_3px_rgba(36,69,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-forest text-cream flex items-center justify-center text-sm font-bold shadow-xs">
                  🪴
                </span>
                <div>
                  <h3 className="m-0 text-sm font-bold text-ink">Botanical Care &amp; Support</h3>
                  <p className="m-0 text-xs text-muted">Soil &amp; Soul Nursery, Bhopal</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-forest bg-sage-100 border border-sage-200 px-2.5 py-0.5 rounded-full">
                Nursery Verified
              </span>
            </div>
            <p className="m-0 text-xs text-muted leading-relaxed">
              Need plant care instructions, soil moisture guidelines, or seasonal potting tips for your delivered plants? Ask our AI botanical companion Sprout anytime.
            </p>
            <div className="pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-muted">Customer Helpline: <strong className="text-ink">98741 512xx</strong></span>
              <span className="text-muted">Direct Email: <strong className="text-ink">soil&soul@gmail.com</strong></span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 content-start">
          <Card>
            <CardHeader title="Order Total" />
            <OrderTotals order={order} />
          </Card>
          {order.deliveryAddress && (
            <Card>
              <CardHeader title="Delivery Address" />
              <DeliveryAddress address={order.deliveryAddress} />
            </Card>
          )}
          {canCustomerCancel(order) && <CancelOrder key={order.updatedAt} order={order} onCancelled={replace} />}
        </div>
      </div>
    </div>
  );
}
