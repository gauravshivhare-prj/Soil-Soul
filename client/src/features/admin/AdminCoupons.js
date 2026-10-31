"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { AdminHeader } from "@/components/admin/AdminParts";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { formatDate, formatPrice } from "@/lib/format";

function localDateTime(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

const initialForm = () => ({ code: "", discountType: "PERCENT", value: "10", minOrderAmount: "0", maxDiscountAmount: "", startsAt: localDateTime(new Date()), expiresAt: "", usageLimit: "", perCustomerLimit: "1" });

export default function AdminCoupons() {
  const { authRequest } = useAuth();
  const [state, setState] = useState({ status: "loading", coupons: [], error: null });
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (signal) => {
    try {
      const data = await authRequest("/admin/coupons", { signal });
      if (!signal.aborted) setState({ status: "ready", coupons: data.coupons, error: null });
    } catch (error) {
      if (!signal.aborted) setState({ status: "error", coupons: [], error });
    }
  }, [authRequest]);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function create(event) {
    event.preventDefault();
    setBusy(true); setNotice("");
    try {
      await authRequest("/admin/coupons", { method: "POST", body: {
        ...form,
        value: Number(form.value),
        minOrderAmount: Number(form.minOrderAmount),
        maxDiscountAmount: form.discountType === "PERCENT" && form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perCustomerLimit: Number(form.perCustomerLimit),
        isActive: true,
      } });
      setNotice("Coupon created.");
      setForm(initialForm());
      const controller = new AbortController(); await load(controller.signal);
    } catch (error) { setState((s) => ({ ...s, error })); }
    finally { setBusy(false); }
  }

  async function toggle(coupon) {
    try {
      const data = await authRequest(`/admin/coupons/${coupon._id}`, { method: "PATCH", body: { isActive: !coupon.isActive } });
      setState((s) => ({ ...s, coupons: s.coupons.map((item) => item._id === coupon._id ? data.coupon : item) }));
    } catch (error) { setState((s) => ({ ...s, error })); }
  }

  return (
    <div>
      <AdminHeader title="Coupons & Offers" subtitle="Create one code per order. Coupon eligibility and discounts are checked again at checkout." />
      {state.error && <FormMessage tone="error" className="mb-4">{state.error.message}</FormMessage>}
      {notice && <FormMessage tone="success" className="mb-4">{notice}</FormMessage>}
      <Card className="mb-5">
        <p className="m-0 mb-3 text-sm text-muted">Product and category restricted eligibility is not available in this admin screen. Coupons created here apply store-wide.</p>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TextField label="Code" value={form.code} maxLength={32} required onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <label className="grid gap-1 text-sm font-medium text-ink">Discount type<select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="h-11 rounded-lg border border-line bg-white px-3 text-sm"><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option></select></label>
          <TextField label={form.discountType === "PERCENT" ? "Percent off" : "Amount off (₹)"} type="number" min="0.01" max={form.discountType === "PERCENT" ? 100 : undefined} step="0.01" value={form.value} required onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <TextField label="Minimum subtotal (₹)" type="number" min="0" step="0.01" value={form.minOrderAmount} required onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
          {form.discountType === "PERCENT" && <TextField label="Maximum discount (₹, optional)" type="number" min="0.01" step="0.01" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} />}
          <TextField label="Starts at" type="datetime-local" value={form.startsAt} required onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          <TextField label="Expires at" type="datetime-local" value={form.expiresAt} required onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <TextField label="Total uses (blank = unlimited)" type="number" min="1" step="1" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          <TextField label="Uses per customer" type="number" min="1" max="100" step="1" value={form.perCustomerLimit} required onChange={(e) => setForm({ ...form, perCustomerLimit: e.target.value })} />
          <div className="sm:col-span-2 xl:col-span-4"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Create coupon"}</Button></div>
        </form>
      </Card>
      {state.status === "loading" && <Skeleton className="h-36" />}
      {state.status === "ready" && state.coupons.length === 0 && <Card><EmptyState icon="ticket" title="No coupons yet" description="Create a coupon to make it available in checkout." /></Card>}
      {state.status === "ready" && state.coupons.length > 0 && <div className="grid gap-3">{state.coupons.map((coupon) => <Card key={coupon._id}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="m-0 text-base font-semibold text-ink">{coupon.code}</h2><p className="m-0 mt-1 text-sm text-muted">{coupon.discountType === "PERCENT" ? `${coupon.value}% off` : `${formatPrice(coupon.value)} off`} · minimum {formatPrice(coupon.minOrderAmount)} · uses {coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</p><p className="m-0 mt-1 text-xs text-muted">{formatDate(coupon.startsAt)} – {formatDate(coupon.expiresAt)} · {coupon.perCustomerLimit} per customer</p></div>
          <Button size="sm" variant={coupon.isActive ? "outline" : "primary"} onClick={() => toggle(coupon)}>{coupon.isActive ? "Disable" : "Enable"}</Button>
        </div>
      </Card>)}</div>}
    </div>
  );
}
