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
  OrderStatusHistory,
  OrderTimeline,
  OrderTotals,
  PAYMENT_METHOD_LABEL,
  canCustomerCancel,
  statusKey,
} from "@/features/orders/OrderParts";
import { formatDate } from "@/lib/format";
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
          Placed on {formatDate(order.createdAt)} · {PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
        </p>
      </div>

      <Card>
        <OrderTimeline status={order.orderStatus} />
        <OrderStatusHistory history={order.statusHistory} />
        {order.cancellation?.reason && <p className="m-0 mt-3 text-sm text-muted">Reason: {order.cancellation.reason}</p>}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Items" />
          <OrderItems items={order.items} />
        </Card>
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
          <ReturnRequests order={order} />
          {canCustomerCancel(order) && <CancelOrder key={order.updatedAt} order={order} onCancelled={replace} />}
        </div>
      </div>
    </div>
  );
}
