"use client";

/**
 * AccountSettings — profile, password and notification preferences.
 * Validated client-side; saving shows a demo confirmation only.
 */

import { useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Checkbox, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { email, password, phone, required, validate } from "@/lib/validation";

function useForm(initial, rules, onValid) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
  };
  function submit(e) {
    e.preventDefault();
    const result = validate(values, rules);
    setErrors(result.errors);
    if (!result.isValid) {
      const first = Object.keys(rules).find((f) => result.errors[f]);
      e.currentTarget.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    onValid(values, setValues);
  }
  return { values, errors, set, submit };
}

export default function AccountSettings({ user }) {
  const { notify } = useToast();

  const profile = useForm({ name: user.name, email: user.email, phone: user.phone }, { name: required("Full name"), email, phone }, () =>
    notify("Profile saved (demo — not stored on a server)")
  );

  const security = useForm(
    { current: "", next: "", confirm: "" },
    {
      current: required("Current password"),
      next: password,
      confirm: [required("Password confirmation"), (v, all) => (v === all.next ? "" : "Passwords don't match.")],
    },
    (_, setValues) => {
      setValues({ current: "", next: "", confirm: "" });
      notify("Password change simulated — authentication isn't connected yet");
    }
  );

  const [prefs, setPrefs] = useState({ orders: true, offers: false, tips: true });

  return (
    <div className="grid gap-5 2xl:grid-cols-2 items-start">
      <Card>
        <CardHeader title="Profile Information" />
        <form onSubmit={profile.submit} noValidate className="grid gap-4">
          <TextField label="Full name" name="name" value={profile.values.name} onChange={profile.set("name")} error={profile.errors.name} autoComplete="name" required />
          <TextField label="Email address" name="email" type="email" value={profile.values.email} onChange={profile.set("email")} error={profile.errors.email} autoComplete="email" required />
          <TextField label="Mobile number" name="phone" type="tel" value={profile.values.phone} onChange={profile.set("phone")} error={profile.errors.phone} autoComplete="tel" required />
          <div><Button type="submit">Save Changes</Button></div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Change Password" />
        <form onSubmit={security.submit} noValidate className="grid gap-4">
          <TextField label="Current password" name="current" type="password" value={security.values.current} onChange={security.set("current")} error={security.errors.current} autoComplete="current-password" required />
          <TextField label="New password" name="next" type="password" value={security.values.next} onChange={security.set("next")} error={security.errors.next} hint="At least 8 characters, with a letter and a number." autoComplete="new-password" required />
          <TextField label="Confirm new password" name="confirm" type="password" value={security.values.confirm} onChange={security.set("confirm")} error={security.errors.confirm} autoComplete="new-password" required />
          <div><Button type="submit">Update Password</Button></div>
        </form>
      </Card>

      <Card className="2xl:col-span-2">
        <CardHeader title="Email Preferences" />
        <fieldset className="m-0 p-0 border-0 grid gap-3">
          <legend className="sr-only">Email preferences</legend>
          <Checkbox label="Order updates and delivery notifications" checked={prefs.orders} onChange={(e) => setPrefs((p) => ({ ...p, orders: e.target.checked }))} />
          <Checkbox label="Offers, new arrivals and seasonal sales" checked={prefs.offers} onChange={(e) => setPrefs((p) => ({ ...p, offers: e.target.checked }))} />
          <Checkbox label="Plant care tips and guides" checked={prefs.tips} onChange={(e) => setPrefs((p) => ({ ...p, tips: e.target.checked }))} />
        </fieldset>
        <Button className="mt-4" variant="outline" onClick={() => notify("Preferences saved (demo)")}>Save Preferences</Button>
      </Card>
    </div>
  );
}
