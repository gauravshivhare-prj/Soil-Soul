"use client";

import { useEffect, useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { FormMessage, Skeleton } from "@/components/ui/States";
import { useAuth } from "@/features/auth/AuthProvider";
import { formatDate, formatPrice } from "@/lib/format";

const STATUS_LABEL = { REQUESTED: "Requested", APPROVED: "Approved", REJECTED: "Rejected", RECEIVED: "Received" };

export default function ReturnRequests({ order }) {
  const { authRequest } = useAuth();
  const [state, setState] = useState({ status: "loading", returns: [], policy: null, error: null });
  const [itemIndex, setItemIndex] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    authRequest(`/orders/${encodeURIComponent(order.orderNumber)}/returns`, { signal: controller.signal })
      .then((data) => setState({ status: "ready", returns: data.returns, policy: data.policy, error: null }))
      .catch((error) => { if (!controller.signal.aborted) setState({ status: "error", returns: [], policy: null, error }); });
    return () => controller.abort();
  }, [authRequest, order.orderNumber]);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const data = await authRequest(`/orders/${encodeURIComponent(order.orderNumber)}/returns`, { method: "POST", body: { itemIndex: Number(itemIndex), quantity: Number(quantity), reason } });
      setState((previous) => ({ ...previous, returns: [data.returnRequest, ...previous.returns] }));
      setReason(""); setNotice("Your return request was submitted.");
    } catch (error) { setState((previous) => ({ ...previous, error })); }
    finally { setBusy(false); }
  }

  const canRequest = order.orderStatus === "DELIVERED" && state.status === "ready" && state.policy?.enabled && state.policy?.deliveredAt && Date.now() <= new Date(state.policy.deliveredAt).getTime() + state.policy.windowDays * 86400000;
  const remainingQuantity = (index) => Math.max(0, (order.items[index]?.quantity ?? 0) - state.returns.filter((entry) => entry.itemIndex === index && entry.status !== "REJECTED").reduce((sum, entry) => sum + entry.quantity, 0));
  const alreadyRequested = (index) => remainingQuantity(index) === 0;

  return (
    <Card>
      <CardHeader title="Returns" />
      {state.status === "loading" && <Skeleton className="h-16" />}
      {state.error && <FormMessage tone="error">{state.error.message}</FormMessage>}
      {state.status === "ready" && !state.policy.enabled && <p className="m-0 text-sm text-muted">Return requests are not enabled yet while the store return policy is being configured.</p>}
      {state.status === "ready" && state.policy.enabled && order.orderStatus !== "DELIVERED" && <p className="m-0 text-sm text-muted">Return requests are available after delivery.</p>}
      {state.returns.length > 0 && <ul className="m-0 mb-4 grid list-none gap-2 p-0">{state.returns.map((entry) => <li key={entry.id} className="rounded-lg bg-cream p-3 text-sm"><div className="flex justify-between gap-2"><strong>{entry.productName} × {entry.quantity}</strong><span>{STATUS_LABEL[entry.status]}</span></div><p className="m-0 mt-1 text-muted">{entry.reason} · {formatPrice(entry.amount)} gross pre-discount item value</p><p className="m-0 mt-1 text-xs text-muted">This is not a refund quote. Discount allocation requires a store policy.</p><p className="m-0 mt-1 text-xs text-muted">Refund record: {entry.refundStatus === "RECORDED" ? "COD bookkeeping recorded; no payment transfer is implied" : entry.refundStatus}</p></li>)}</ul>}
      {canRequest && <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-ink">Order item<select value={itemIndex} onChange={(event) => { setItemIndex(event.target.value); setQuantity("1"); }} className="h-11 rounded-lg border border-line bg-white px-3 text-sm">{order.items.map((item, index) => <option key={index} value={index} disabled={alreadyRequested(index)}>{item.name} — {remainingQuantity(index)} eligible</option>)}</select></label>
        <TextField label="Quantity" type="number" min="1" max={remainingQuantity(Number(itemIndex)) || 1} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
        <TextArea label="Reason for return" minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} required rows={3} />
        {notice && <FormMessage tone="success">{notice}</FormMessage>}
        <p className="m-0 text-xs text-muted">Request window: {state.policy.windowDays} days from {formatDate(state.policy.deliveredAt)}. Item is not restocked automatically when a request is approved.</p>
        <div><Button type="submit" variant="outline" disabled={busy || order.items.every((_, index) => alreadyRequested(index)) || Number(quantity) > remainingQuantity(Number(itemIndex))}>{busy ? "Submitting…" : "Request return"}</Button></div>
      </form>}
    </Card>
  );
}
