"use client";

import { useEffect, useState } from "react";
import { brandSerif } from "@/app/fonts";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import ProductImage from "@/components/ui/ProductImage";
import { TextArea } from "@/components/ui/Field";
import { FormMessage, Skeleton } from "@/components/ui/States";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatPrice } from "@/lib/format";

const STATUS_LABEL = {
  REQUESTED: "Under Review",
  APPROVED: "Approved for Pickup",
  REJECTED: "Rejected",
  RECEIVED: "Received & Inspected",
};

const itemImage = (item) => (item?.image?.src ? { src: item.image.src, alt: item.image.alt || item.name } : null);

export default function ReturnRequests({ order }) {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const [state, setState] = useState({ status: "loading", returns: [], policy: null, isExpired: false, error: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestType, setRequestType] = useState("RETURN");
  const [upiId, setUpiId] = useState("");
  const [selectedItems, setSelectedItems] = useState({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    authRequest(`/orders/${encodeURIComponent(order.orderNumber)}/returns`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          const now = Date.now();
          const policy = data.policy;
          const deliveredTime = policy?.deliveredAt ? new Date(policy.deliveredAt).getTime() : now;
          const windowMs = (policy?.windowDays || 7) * 86400000;
          const isExpired = now > deliveredTime + windowMs;
          setState({ status: "ready", returns: data.returns || [], policy, isExpired, error: null });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: "error", returns: [], policy: null, isExpired: false, error });
      });
    return () => controller.abort();
  }, [authRequest, order.orderNumber]);

  const canRequest = order.orderStatus === "DELIVERED" && !state.isExpired;

  const remainingQuantity = (index) =>
    Math.max(
      0,
      (order.items[index]?.quantity ?? 0) -
        state.returns
          .filter((entry) => entry.itemIndex === index)
          .reduce((sum, entry) => sum + entry.quantity, 0)
    );

  const alreadyRequested = (index) => remainingQuantity(index) === 0;
  const allItemsRequested = order.items.every((_, index) => alreadyRequested(index));

  function openModal() {
    const initial = {};
    order.items.forEach((item, index) => {
      const rem = remainingQuantity(index);
      if (rem > 0) {
        initial[index] = { selected: true, quantity: rem };
      }
    });
    setSelectedItems(initial);
    setUpiId("");
    setReason("");
    setModalError("");
    setIsModalOpen(true);
  }

  const selectedEntries = Object.entries(selectedItems).filter(([_, val]) => val?.selected && val?.quantity > 0);
  const totalSelectedUnits = selectedEntries.reduce((sum, [_, val]) => sum + Number(val.quantity), 0);
  const totalEstimatedValue = selectedEntries.reduce((sum, [idx, val]) => {
    const item = order.items[Number(idx)];
    return sum + (item?.unitPrice || 0) * Number(val.quantity);
  }, 0);

  const eligibleItems = order.items.map((it, idx) => ({ ...it, rem: remainingQuantity(idx), idx })).filter((it) => it.rem > 0);
  const allEligibleSelected = eligibleItems.length > 0 && eligibleItems.every((it) => selectedItems[it.idx]?.selected);

  function toggleSelectAll() {
    if (allEligibleSelected) {
      setSelectedItems((prev) => {
        const next = { ...prev };
        eligibleItems.forEach((it) => {
          if (next[it.idx]) next[it.idx] = { ...next[it.idx], selected: false };
        });
        return next;
      });
    } else {
      setSelectedItems((prev) => {
        const next = { ...prev };
        eligibleItems.forEach((it) => {
          next[it.idx] = { selected: true, quantity: next[it.idx]?.quantity || it.rem };
        });
        return next;
      });
    }
  }

  function handleToggleItem(index, defaultQuantity) {
    setSelectedItems((prev) => {
      const current = prev[index];
      const willBeSelected = !current?.selected;
      return {
        ...prev,
        [index]: {
          selected: willBeSelected,
          quantity: current?.quantity || defaultQuantity || 1,
        },
      };
    });
  }

  function handleQuantityChange(index, qty, max) {
    const parsed = Math.max(1, Math.min(Number(qty) || 1, max));
    setSelectedItems((prev) => ({
      ...prev,
      [index]: {
        selected: true,
        quantity: parsed,
      },
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setModalError("");

    const itemsToSubmit = selectedEntries.map(([idx, val]) => ({
      itemIndex: Number(idx),
      quantity: Number(val.quantity),
    }));

    if (itemsToSubmit.length === 0) {
      setModalError("Please select at least one item to return or exchange.");
      setBusy(false);
      return;
    }

    if (requestType === "RETURN") {
      const cleanUpi = upiId.trim();
      if (!cleanUpi || !cleanUpi.includes("@")) {
        setModalError("Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 98741512xx@upi) to receive your refund.");
        setBusy(false);
        return;
      }
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setModalError("Please provide a reason of at least 5 characters.");
      setBusy(false);
      return;
    }

    const typeLabel = requestType === "EXCHANGE" ? "EXCHANGE / REPLACEMENT" : "RETURN FOR REFUND";
    const prefixedReason = `[${typeLabel}] ${reason.trim()}`;
    const cleanUpi = requestType === "RETURN" ? upiId.trim() : null;

    try {
      const responses = await Promise.all(
        itemsToSubmit.map(({ itemIndex, quantity }) =>
          authRequest(`/orders/${encodeURIComponent(order.orderNumber)}/returns`, {
            method: "POST",
            body: {
              itemIndex,
              quantity,
              reason: prefixedReason,
              upiId: cleanUpi,
            },
          })
        )
      );

      const createdReturns = responses.map((r) => r.returnRequest).filter(Boolean);
      setState((previous) => ({ ...previous, returns: [...createdReturns, ...previous.returns] }));
      setReason("");
      setUpiId("");
      setIsModalOpen(false);
      notify(
        `Your ${requestType === "EXCHANGE" ? "exchange" : "return"} request for ${itemsToSubmit.length} item(s) was submitted successfully.`
      );
    } catch (error) {
      setModalError(error.message || "Failed to submit request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Returns & Exchanges"
          action={
            canRequest && (
              <span className="text-[11px] font-semibold text-forest bg-sage-100 border border-sage-200 px-2 py-0.5 rounded-full">
                7-Day Guarantee
              </span>
            )
          }
        />
        {state.status === "loading" && <Skeleton className="h-16" />}
        {state.error && <FormMessage tone="error">{state.error.message}</FormMessage>}

        {/* Status: Not yet delivered */}
        {state.status === "ready" && order.orderStatus !== "DELIVERED" && (
          <div className="rounded-xl border border-sage-200 bg-sage-50/70 p-3.5 space-y-1.5 text-sm">
            <div className="flex items-center gap-1.5 font-semibold text-forest text-xs uppercase tracking-wide">
              <span>🪴 7-Day Healthy Plant Guarantee</span>
            </div>
            <p className="m-0 text-xs text-muted leading-relaxed">
              Return &amp; exchange options will become active here once your package is delivered. You will have 7 full days from delivery to request a free plant replacement or refund.
            </p>
          </div>
        )}

        {/* Status: Delivered but guarantee window expired */}
        {state.status === "ready" && order.orderStatus === "DELIVERED" && !canRequest && state.returns.length === 0 && (
          <p className="m-0 text-sm text-muted">
            The 7-day return and exchange window for this delivered order has ended.
          </p>
        )}

        {/* Submitted Returns List */}
        {state.returns.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="m-0 text-xs font-semibold text-muted uppercase tracking-wider">
              Submitted Requests ({state.returns.length})
            </p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {state.returns.map((entry) => {
                const isExchange = entry.reason?.includes("EXCHANGE");
                return (
                  <li key={entry.id} className="rounded-xl bg-[#faf8f2] p-3 text-sm border border-line space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-ink text-xs sm:text-sm">{entry.productName} × {entry.quantity}</span>
                          <Badge variant="outline" className="text-[10px] py-0">{isExchange ? "Exchange" : "Return"}</Badge>
                        </div>
                        <p className="m-0 text-xs text-muted line-clamp-2 mt-0.5">{entry.reason}</p>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-sage-100 text-forest shrink-0">
                        {STATUS_LABEL[entry.status] || entry.status}
                      </span>
                    </div>

                    {/* UPI and Refund Info */}
                    {entry.upiId && !isExchange && (
                      <div className="rounded-lg bg-sand/40 border border-line/60 px-2.5 py-1.5 text-[11px] text-muted flex items-center justify-between gap-2">
                        <span>💳 Refund UPI: <strong className="font-mono text-ink">{entry.upiId}</strong></span>
                        {entry.refundStatus === "RECORDED" ? (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            ✅ Refund Processed
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                            ⏳ Refund Pending
                          </span>
                        )}
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-line/40 flex justify-between text-[11px] text-muted">
                      <span>Value: {formatPrice(entry.amount)}</span>
                      <span>{formatDate(entry.createdAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Direct Action Button to trigger popup */}
        {canRequest && (
          <div className="space-y-2">
            {state.returns.length === 0 && (
              <p className="m-0 text-xs text-muted leading-relaxed">
                Damaged plant, wilting leaves, or need another size? Easily submit a return or exchange request under our 7-day guarantee.
              </p>
            )}

            {!allItemsRequested ? (
              <Button
                type="button"
                variant={state.returns.length > 0 ? "outline" : "primary"}
                className="w-full justify-center !py-2.5 text-xs sm:text-sm font-semibold shadow-xs"
                onClick={openModal}
              >
                <Icon name="refresh" size={15} />
                {state.returns.length > 0 ? "+ Request For Another Item" : "Request Return / Exchange"}
              </Button>
            ) : (
              <p className="m-0 text-xs text-muted text-center italic py-1">
                All eligible items from this order have active return/exchange requests.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Return & Exchange Modal Dialog */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          onClick={() => !busy && setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-line flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line px-5 sm:px-6 py-4 bg-sand/30 shrink-0">
              <div>
                <h2 id="return-modal-title" className={`${brandSerif.className} m-0 text-lg sm:text-xl font-bold text-heading`}>
                  Request Return or Exchange
                </h2>
                <p className="m-0 mt-0.5 text-xs text-muted">
                  Order #{order.orderNumber} · 7-Day Healthy Plant Guarantee
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-line flex items-center justify-center text-muted hover:text-ink hover:bg-sand/40 transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                {modalError && <FormMessage tone="error">{modalError}</FormMessage>}

                {/* Request Type Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                    Choose Request Type
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRequestType("RETURN")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        requestType === "RETURN"
                          ? "border-forest bg-sage-50/80 shadow-xs ring-1 ring-forest"
                          : "border-line bg-white hover:border-sage-300"
                      }`}
                    >
                      <span className="text-base block mb-1">🔄</span>
                      <strong className="block text-xs sm:text-sm text-ink">Return (Refund)</strong>
                      <span className="block text-[11px] text-muted leading-tight mt-0.5">
                        Refund transferred directly to your UPI
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRequestType("EXCHANGE")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        requestType === "EXCHANGE"
                          ? "border-forest bg-sage-50/80 shadow-xs ring-1 ring-forest"
                          : "border-line bg-white hover:border-sage-300"
                      }`}
                    >
                      <span className="text-base block mb-1">🪴</span>
                      <strong className="block text-xs sm:text-sm text-ink">Exchange (Replace)</strong>
                      <span className="block text-[11px] text-muted leading-tight mt-0.5">
                        Receive fresh healthy replacement
                      </span>
                    </button>
                  </div>
                </div>

                {/* UPI ID for Refund Input */}
                {requestType === "RETURN" && (
                  <div className="rounded-xl border border-sage-300 bg-sage-50/70 p-3.5 space-y-1.5">
                    <label htmlFor="refund-upi-input" className="block text-xs font-bold text-ink">
                      UPI ID for Refund Transfer <span className="text-danger">*</span>
                    </label>
                    <input
                      id="refund-upi-input"
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. 98741512xx@upi or yourname@okhdfcbank"
                      className="w-full h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink font-mono outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                      required
                    />
                    <p className="m-0 text-[11px] text-muted leading-relaxed">
                      💡 Your refund of {formatPrice(totalEstimatedValue)} will be transferred directly to this UPI address after item pickup &amp; verification.
                    </p>
                  </div>
                )}

                {/* Items Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      Select Items to {requestType === "EXCHANGE" ? "Exchange" : "Return"} ({eligibleItems.length} eligible)
                    </label>
                    {eligibleItems.length > 1 && (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-xs font-semibold text-forest hover:underline cursor-pointer bg-transparent border-0 p-0"
                      >
                        {allEligibleSelected ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {order.items.map((item, index) => {
                      const rem = remainingQuantity(index);
                      const isEligible = rem > 0;
                      const isSelected = !!selectedItems[index]?.selected;
                      const selectedQty = selectedItems[index]?.quantity || rem || 1;

                      return (
                        <div
                          key={index}
                          className={`rounded-xl border p-3 transition-colors ${
                            !isEligible
                              ? "bg-sand/20 border-line/60 opacity-60"
                              : isSelected
                              ? "border-forest/60 bg-sage-50/50"
                              : "border-line bg-white hover:border-sage-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <label className="flex items-center pt-1 cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={!isEligible}
                                checked={isSelected}
                                onChange={() => handleToggleItem(index, rem)}
                                className="w-4 h-4 rounded text-forest accent-forest focus:ring-forest cursor-pointer"
                              />
                            </label>

                            <ProductImage image={itemImage(item)} className="w-12 h-12 flex-shrink-0" rounded="rounded-lg" sizes="48px" />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="m-0 text-xs sm:text-sm font-semibold text-ink leading-snug">
                                    {item.name}
                                  </p>
                                  <p className="m-0 mt-0.5 text-xs text-muted">
                                    {formatPrice(item.unitPrice)} each · Ordered: {item.quantity}
                                  </p>
                                </div>
                                {!isEligible && (
                                  <span className="text-[10px] font-semibold text-muted bg-sand/60 px-2 py-0.5 rounded-full shrink-0">
                                    Already Requested
                                  </span>
                                )}
                              </div>

                              {isEligible && isSelected && (
                                <div className="mt-2.5 pt-2 border-t border-line/40 flex items-center justify-between flex-wrap gap-2">
                                  <span className="text-xs text-muted font-medium">
                                    Qty to {requestType === "EXCHANGE" ? "exchange" : "return"}:
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center rounded-lg border border-line bg-white shadow-2xs overflow-hidden">
                                      <button
                                        type="button"
                                        disabled={selectedQty <= 1}
                                        onClick={() => handleQuantityChange(index, selectedQty - 1, rem)}
                                        className="w-7 h-7 flex items-center justify-center text-ink hover:bg-sand/50 disabled:opacity-30 disabled:pointer-events-none text-sm font-bold cursor-pointer"
                                        aria-label="Decrease quantity"
                                      >
                                        −
                                      </button>
                                      <span className="w-7 text-center text-xs font-semibold text-ink select-none">
                                        {selectedQty}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={selectedQty >= rem}
                                        onClick={() => handleQuantityChange(index, selectedQty + 1, rem)}
                                        className="w-7 h-7 flex items-center justify-center text-ink hover:bg-sand/50 disabled:opacity-30 disabled:pointer-events-none text-sm font-bold cursor-pointer"
                                        aria-label="Increase quantity"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <span className="text-[11px] text-muted">of {rem}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selection Summary */}
                <div className="rounded-xl bg-sage-50/80 border border-sage-200 p-3 text-xs flex items-center justify-between">
                  <span className="text-ink font-medium">
                    {totalSelectedUnits > 0
                      ? `${totalSelectedUnits} item(s) selected`
                      : "No items selected"}
                  </span>
                  <span className="text-forest font-bold text-sm">
                    Est. Value: {formatPrice(totalEstimatedValue)}
                  </span>
                </div>

                {/* Reason */}
                <TextArea
                  label={`Reason for ${requestType === "EXCHANGE" ? "Exchange" : "Return"}`}
                  minLength={5}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Received damaged plant leaves, wilting stems during courier transit, pot size mismatch, etc."
                  hint="Please describe the issue (minimum 5 characters)"
                  required
                  rows={3}
                />

                {/* Guarantee Info */}
                <div className="rounded-xl bg-sand/50 border border-line p-3 text-xs text-muted flex items-start gap-2">
                  <span className="text-forest mt-0.5">ℹ️</span>
                  <span>
                    <strong>7-Day Botanical Guarantee:</strong> Requests are reviewed within 24 hours. For damaged plants or wrong items, free replacement shipping or refund is arranged at zero cost.
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-line px-5 sm:px-6 py-4 bg-sand/20 flex items-center justify-end gap-3 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={busy || totalSelectedUnits === 0}
                >
                  {busy
                    ? "Submitting Requests…"
                    : `Submit ${requestType === "EXCHANGE" ? "Exchange" : "Return"} (${totalSelectedUnits} items)`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
