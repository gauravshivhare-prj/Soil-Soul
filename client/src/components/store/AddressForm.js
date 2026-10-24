"use client";

/**
 * AddressForm — delivery address fields with client-side validation.
 * Used at checkout ("Add New Address") and in Account › Addresses.
 * Calls onSave(address) with a new id. `showSaveOptions={false}` hides the address-book-only
 * fields (address type, default) where nothing is saved, e.g. checkout.
 */

import { useState } from "react";
import { INDIAN_STATES } from "@/data/commerce";
import { phone, pincode, required, validate } from "@/lib/validation";
import { SelectField, TextField, Checkbox } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const EMPTY = { label: "Home", name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", isDefault: false };

const RULES = {
  name: required("Full name"),
  phone,
  line1: required("Address"),
  city: required("City"),
  state: required("State"),
  pincode,
};

export default function AddressForm({ initial, onSave, onCancel, submitLabel = "Save Address", showSaveOptions = true }) {
  const [values, setValues] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});

  function set(field) {
    return (e) => {
      const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setValues((v) => ({ ...v, [field]: value }));
      if (errors[field]) setErrors((err) => ({ ...err, [field]: "" }));
    };
  }

  function submit(e) {
    e.preventDefault();
    const result = validate(values, RULES);
    setErrors(result.errors);
    if (!result.isValid) {
      // Move focus to the first invalid field for keyboard and screen-reader users.
      const first = Object.keys(RULES).find((f) => result.errors[f]);
      e.currentTarget.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    onSave({ ...values, id: values.id ?? `addr-${Date.now()}` });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <TextField label="Full name" name="name" value={values.name} onChange={set("name")} error={errors.name} autoComplete="name" required />
      <TextField label="Mobile number" name="phone" type="tel" value={values.phone} onChange={set("phone")} error={errors.phone} autoComplete="tel" inputMode="tel" placeholder="98765 43210" required />
      <TextField label="Address (house no., building, street)" name="line1" value={values.line1} onChange={set("line1")} error={errors.line1} autoComplete="address-line1" required className="sm:col-span-2" />
      <TextField label="Locality / landmark" name="line2" value={values.line2} onChange={set("line2")} autoComplete="address-line2" hint="Optional" className="sm:col-span-2" />
      <TextField label="City" name="city" value={values.city} onChange={set("city")} error={errors.city} autoComplete="address-level2" required />
      <SelectField
        label="State"
        name="state"
        value={values.state}
        onChange={set("state")}
        error={errors.state}
        required
        options={[{ value: "", label: "Select state" }, ...INDIAN_STATES.map((s) => ({ value: s, label: s }))]}
      />
      <TextField label="PIN code" name="pincode" value={values.pincode} onChange={set("pincode")} error={errors.pincode} autoComplete="postal-code" inputMode="numeric" maxLength={6} required />
      {showSaveOptions && (
        <>
          <SelectField
            label="Address type"
            name="label"
            value={values.label}
            onChange={set("label")}
            options={["Home", "Work", "Other"].map((l) => ({ value: l, label: l }))}
          />
          <Checkbox label="Make this my default address" checked={values.isDefault} onChange={set("isDefault")} className="sm:col-span-2" />
        </>
      )}
      <div className="sm:col-span-2 flex flex-wrap gap-2.5">
        <Button type="submit">{submitLabel}</Button>
        {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
