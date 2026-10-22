"use client";

/**
 * CouponManager — list, toggle and create coupons locally (demo).
 * Real coupon rules must be enforced by the server at checkout.
 */

import { useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SelectField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { DataTable } from "@/components/admin/AdminParts";
import { formatPrice } from "@/lib/format";
import { required, validate } from "@/lib/validation";

const TYPE_LABEL = { percent: "Percentage", flat: "Flat amount", shipping: "Free shipping" };

function describe(c) {
  if (c.type === "percent") return `${c.value}% off`;
  if (c.type === "flat") return `${formatPrice(c.value)} off`;
  return "Free shipping";
}

export default function CouponManager({ initialCoupons }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [form, setForm] = useState({ code: "", type: "percent", value: "", minSubtotal: "" });
  const [errors, setErrors] = useState({});
  const { notify } = useToast();

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
  };

  function submit(e) {
    e.preventDefault();
    const rules = {
      code: [
        required("Code"),
        (v) => (/^[A-Z0-9]{4,15}$/.test(v.toUpperCase()) ? "" : "Use 4–15 letters or numbers."),
        (v) => (coupons.some((c) => c.code === v.toUpperCase()) ? "This code already exists." : ""),
      ],
      value: (v, all) => {
        if (all.type === "shipping") return "";
        const n = Number(v);
        if (!v || !Number.isFinite(n) || n <= 0) return "Enter a value greater than 0.";
        if (all.type === "percent" && n > 90) return "Percentage can't exceed 90%.";
        return "";
      },
    };
    const result = validate(form, rules);
    setErrors(result.errors);
    if (!result.isValid) return;
    const code = form.code.toUpperCase();
    setCoupons((list) => [
      ...list,
      { id: code, code, type: form.type, value: Number(form.value) || 0, minSubtotal: Number(form.minSubtotal) || 0, uses: 0, active: true },
    ]);
    setForm({ code: "", type: "percent", value: "", minSubtotal: "" });
    notify(`Coupon ${code} created (demo)`);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px] items-start">
      <Card className="min-w-0">
        <DataTable caption="Coupons" head={["Code", "Offer", "Min. order", "Uses", "Status", ""]} minWidth={600}>
          {coupons.map((c) => (
            <tr key={c.id}>
              <td className="font-semibold text-ink tracking-wide">{c.code}</td>
              <td className="text-ink">{describe(c)}</td>
              <td className="text-muted">{c.minSubtotal ? formatPrice(c.minSubtotal) : "—"}</td>
              <td className="text-muted">{c.uses}</td>
              <td>{c.active ? <Badge>Active</Badge> : <Badge tone="neutral">Paused</Badge>}</td>
              <td>
                <Button size="sm" variant="outline" onClick={() => setCoupons((l) => l.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)))}>
                  {c.active ? "Pause" : "Activate"}<span className="sr-only"> {c.code}</span>
                </Button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>

      <Card>
        <CardHeader title="Create Coupon" />
        <form onSubmit={submit} noValidate className="grid gap-4">
          <TextField label="Code" name="code" value={form.code} onChange={set("code")} error={errors.code} inputClassName="uppercase" required />
          <SelectField label="Type" name="type" value={form.type} onChange={set("type")} options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
          {form.type !== "shipping" && (
            <TextField label={form.type === "percent" ? "Discount (%)" : "Discount (₹)"} name="value" type="number" inputMode="numeric" value={form.value} onChange={set("value")} error={errors.value} required />
          )}
          <TextField label="Minimum order (₹)" name="minSubtotal" type="number" inputMode="numeric" value={form.minSubtotal} onChange={set("minSubtotal")} hint="Optional" />
          <div><Button type="submit">Create Coupon</Button></div>
        </form>
      </Card>
    </div>
  );
}
