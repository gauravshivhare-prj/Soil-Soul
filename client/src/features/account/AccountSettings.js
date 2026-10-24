"use client";

/**
 * AccountSettings — profile (PATCH /users/me: name and optional phone; email is the
 * sign-in identity and can't be changed here) and password change
 * (POST /auth/change-password, which signs out other sessions).
 */

import { useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { retryAfterText } from "@/lib/api";
import { password, phone, required, validate } from "@/lib/validation";
import { useAuth } from "@/features/auth/AuthProvider";

const optionalPhone = (value) => (String(value ?? "").trim() ? phone(value) : "");

function focusFirst(form, errors, fields) {
  const first = fields.find((f) => errors[f]);
  if (first) form.querySelector(`[name="${first}"]`)?.focus();
}

function ProfileForm({ user }) {
  const { updateProfile } = useAuth();
  const { notify } = useToast();
  const [values, setValues] = useState({ name: user.name ?? "", phone: user.phone ?? "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const rules = { name: required("Full name"), phone: optionalPhone };

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
    setServerError(null);
  };

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const result = validate(values, rules);
    setErrors(result.errors);
    if (!result.isValid) return focusFirst(form, result.errors, Object.keys(rules));
    setIsBusy(true);
    try {
      const updated = await updateProfile({ name: values.name.trim(), phone: values.phone.trim() || null });
      setValues({ name: updated.name ?? "", phone: updated.phone ?? "" });
      notify("Profile saved.");
    } catch (err) {
      if (err.code === "PHONE_EXISTS") setErrors((x) => ({ ...x, phone: err.message }));
      else setServerError(err.message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Profile Information" />
      <form onSubmit={submit} noValidate className="grid gap-4">
        {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
        <TextField label="Full name" name="name" value={values.name} onChange={set("name")} error={errors.name} autoComplete="name" maxLength={100} required />
        <TextField label="Email address" name="email" type="email" value={user.email} readOnly hint="Your sign-in email can't be changed here." />
        <TextField
          label="Mobile number (optional)"
          name="phone"
          type="tel"
          inputMode="tel"
          value={values.phone}
          onChange={set("phone")}
          error={errors.phone}
          autoComplete="tel"
          hint="Indian mobile number. Leave empty to remove it."
        />
        <div><Button type="submit" disabled={isBusy}>{isBusy ? "Saving…" : "Save Changes"}</Button></div>
      </form>
    </Card>
  );
}

const EMPTY_PASSWORDS = { current: "", next: "", confirm: "" };

function PasswordForm() {
  const { changePassword } = useAuth();
  const { notify } = useToast();
  const [values, setValues] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const rules = {
    current: required("Current password"),
    next: [password, (v, all) => (v && v === all.current ? "Choose a password different from the current one." : "")],
    confirm: [required("Password confirmation"), (v, all) => (v === all.next ? "" : "Passwords don't match.")],
  };

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
    setServerError(null);
  };

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const result = validate(values, rules);
    setErrors(result.errors);
    if (!result.isValid) return focusFirst(form, result.errors, Object.keys(rules));
    setIsBusy(true);
    try {
      await changePassword(values.current, values.next);
      setValues(EMPTY_PASSWORDS);
      notify("Password updated. Other devices have been signed out.");
    } catch (err) {
      if (err.code === "INVALID_CURRENT_PASSWORD") setErrors((x) => ({ ...x, current: err.message }));
      else setServerError(`${err.message}${err.status === 429 ? retryAfterText(err) : ""}`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Change Password" />
      <form onSubmit={submit} noValidate className="grid gap-4">
        {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
        <TextField label="Current password" name="current" type="password" value={values.current} onChange={set("current")} error={errors.current} autoComplete="current-password" required />
        <TextField label="New password" name="next" type="password" value={values.next} onChange={set("next")} error={errors.next} hint="At least 8 characters, with a letter and a number." autoComplete="new-password" maxLength={128} required />
        <TextField label="Confirm new password" name="confirm" type="password" value={values.confirm} onChange={set("confirm")} error={errors.confirm} autoComplete="new-password" required />
        <div><Button type="submit" disabled={isBusy}>{isBusy ? "Updating…" : "Update Password"}</Button></div>
      </form>
    </Card>
  );
}

export default function AccountSettings() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="grid gap-5 2xl:grid-cols-2 items-start">
      <ProfileForm key={user.id} user={user} />
      <PasswordForm />
    </div>
  );
}
