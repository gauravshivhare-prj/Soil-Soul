"use client";

/**
 * StoreSettings — store details and shipping rules form (demo save).
 */

import { useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { email, phone, required, validate } from "@/lib/validation";

const wholeNumber = (label) => (v) => (v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0 ? "" : `${label} must be a whole number (0 or more).`);

const RULES = {
  storeName: required("Store name"),
  supportEmail: email,
  supportPhone: phone,
  freeShippingThreshold: wholeNumber("Free shipping threshold"),
  shippingFee: wholeNumber("Shipping fee"),
  lowStockThreshold: wholeNumber("Low-stock alert"),
};

export default function StoreSettings({ initial }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const { notify } = useToast();

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
  };

  function submit(e) {
    e.preventDefault();
    const result = validate(values, RULES);
    setErrors(result.errors);
    if (!result.isValid) {
      const first = Object.keys(RULES).find((f) => result.errors[f]);
      e.currentTarget.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    notify("Settings saved (demo — not stored on a server)");
  }

  const field = (name, label, props = {}) => (
    <TextField label={label} name={name} value={values[name]} onChange={set(name)} error={errors[name]} required {...props} />
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 2xl:grid-cols-2 items-start">
      <Card>
        <CardHeader title="Store Information" />
        <div className="grid gap-4">
          {field("storeName", "Store name")}
          {field("supportEmail", "Support email", { type: "email" })}
          {field("supportPhone", "Support phone", { type: "tel" })}
        </div>
      </Card>
      <Card>
        <CardHeader title="Shipping & Inventory" />
        <div className="grid gap-4 sm:grid-cols-2">
          {field("freeShippingThreshold", "Free shipping above (₹)", { type: "number", inputMode: "numeric" })}
          {field("shippingFee", "Shipping fee (₹)", { type: "number", inputMode: "numeric" })}
          {field("lowStockThreshold", "Low-stock alert at", { type: "number", inputMode: "numeric", hint: "Units remaining" })}
        </div>
      </Card>
      <div className="2xl:col-span-2"><Button type="submit">Save Settings</Button></div>
    </form>
  );
}
