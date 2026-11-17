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
  const [requestType, setRequestType] = useState("RETURN");
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
    const prefixedReason = `[${requestType === "EXCHANGE" ? "EXCHANGE / REPLACEMENT" : "RETURN FOR REFUND"}] ${reason.trim()}`;
    try {
      const data = await authRequest(`/orders/${encodeURIComponent(order.orderNumber)}/returns`, {
        method: "POST",
        body: { itemIndex: Number(itemIndex), quantity: Number(quantity), reason: prefixedReason },
      });
      setState((previous) => ({ ...previous, returns: [data.returnRequest, ...previous.returns] }));
      setReason("");
      setNotice(`Your ${requestType === "EXCHANGE" ? "exchange" : "return"} request was successfully submitted.`);
    } catch (error) { setState((previous) => ({ ...previous, error })); }
    finally { setBusy(false); }
  }

  const windowDays = state.policy?.windowDays || 7;
  const deliveredTime = state.policy?.deliveredAt ? new Date(state.policy.deliveredAt).getTime() : Date.now();
  const isWithinWindow = Date.now() <= deliveredTime + windowDays * 86400000;
  const canRequest = order.orderStatus === "DELIVERED" && isWithinWindow;
  const remainingQuantity = (index) => Math.max(0, (order.items[index]?.quantity ?? 0) - state.returns.filter((entry) => entry.itemIndex === index && entry.status !== "REJECTED").reduce((sum, entry) => sum + entry.quantity, 0));
  const alreadyRequested = (index) => remainingQuantity(index) === 0;

  return (
    <Card>
      <CardHeader title="Returns & Exchanges" />
      {state.status === "loading" && <Skeleton className="h-16" />}
      {state.error && <FormMessage tone="error">{state.error.message}</FormMessage>}
      {state.status === "ready" && order.orderStatus !== "DELIVERED" && (
        <div className="rounded-xl border border-sage-200 bg-sage-50/70 p-3.5 space-y-1 text-sm">
          <div className="flex items-center gap-1.5 font-semibold text-forest text-xs uppercase tracking-wide">
            <span>🪴 7-Day Healthy Plant Guarantee</span>
          </div>
          <p className="m-0 text-xs text-muted leading-relaxed">
            Return and exchange options will become active right here once your package is delivered. You will have 7 full days from delivery to request a free plant replacement or refund under our Botanical Guarantee.
          </p>
        </div>
      )}
      {state.status === "ready" && order.orderStatus === "DELIVERED" && !canRequest && (
        <p className="m-0 text-sm text-muted">
          The 7-day return and exchange window for this delivered order has ended.
        </p>
      )}
      {state.returns.length > 0 && (
        <ul className="m-0 mb-4 grid list-none gap-2 p-0">
          {state.returns.map((entry) => (
            <li key={entry.id} className="rounded-lg bg-cream p-3 text-sm border border-line">
              <div className="flex justify-between gap-2">
                <strong>{entry.productName} × {entry.quantity}</strong>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sage-100 text-forest">{STATUS_LABEL[entry.status]}</span>
              </div>
              <p className="m-0 mt-1 text-muted">{entry.reason}</p>
              <p className="m-0 mt-1 text-xs text-muted">Gross item value: {formatPrice(entry.amount)}</p>
              <p className="m-0 mt-1 text-xs text-muted">Status: {entry.refundStatus === "RECORDED" ? "Processed in store records" : entry.refundStatus}</p>
            </li>
          ))}
        </ul>
      )}
      {canRequest && (
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold cursor-pointer ${requestType === "RETURN" ? "border-forest bg-sage-50 text-forest" : "border-line bg-white text-ink"}`}>
              <input type="radio" name="req-type" value="RETURN" checked={requestType === "RETURN"} onChange={() => setRequestType("RETURN")} className="sr-only" />
              🔄 Return (Refund)
            </label>
            <label className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold cursor-pointer ${requestType === "EXCHANGE" ? "border-forest bg-sage-50 text-forest" : "border-line bg-white text-ink"}`}>
              <input type="radio" name="req-type" value="EXCHANGE" checked={requestType === "EXCHANGE"} onChange={() => setRequestType("EXCHANGE")} className="sr-only" />
              🪴 Exchange (Replace)
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Select item to {requestType === "EXCHANGE" ? "exchange" : "return"}
            <select value={itemIndex} onChange={(event) => { setItemIndex(event.target.value); setQuantity("1"); }} className="h-11 rounded-lg border border-line bg-white px-3 text-sm">
              {order.items.map((item, index) => (
                <option key={index} value={index} disabled={alreadyRequested(index)}>
                  {item.name} — {remainingQuantity(index)} eligible
                </option>
              ))}
            </select>
          </label>
          <TextField label="Quantity" type="number" min="1" max={remainingQuantity(Number(itemIndex)) || 1} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
          <TextArea label={`Reason for ${requestType === "EXCHANGE" ? "exchange" : "return"}`} minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Received damaged leaves, wrong size pot, seedling health issue" required rows={3} />
          {notice && <FormMessage tone="success">{notice}</FormMessage>}
          <p className="m-0 text-xs text-muted">Guarantee window: {windowDays} days {state.policy?.deliveredAt ? `from ${formatDate(state.policy.deliveredAt)}` : "from delivery"}. Botanical guarantee ensures 100% healthy arrival.</p>
          <div>
            <Button type="submit" variant="outline" disabled={busy || order.items.every((_, index) => alreadyRequested(index)) || Number(quantity) > remainingQuantity(Number(itemIndex))}>
              {busy ? "Submitting…" : `Request ${requestType === "EXCHANGE" ? "Exchange" : "Return"}`}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
