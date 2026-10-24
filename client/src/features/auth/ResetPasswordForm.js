"use client";

/**
 * ResetPasswordForm — set a new password with the 6-digit code from the reset email.
 * A successful reset signs out every session; the customer then logs in with the new password.
 */

import { useState } from "react";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { email as emailRule, password as passwordRule, validate } from "@/lib/validation";
import { retryAfterText } from "@/lib/api";
import { TextField } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { FormMessage } from "@/components/ui/States";
import { useAuth } from "./AuthProvider";
import { useQueryParam } from "./VerifyEmailForm";

const RULES = {
  email: emailRule,
  code: (value) => (/^\d{6}$/.test(value.trim()) ? "" : "Enter the 6-digit code from the email."),
  newPassword: passwordRule,
  confirm: (value, all) => (value && value === all.newPassword ? "" : "Passwords don't match."),
};

export default function ResetPasswordForm() {
  const { resetPassword, logout, isAuthenticated } = useAuth();
  const urlEmail = useQueryParam("email");
  const [values, setValues] = useState({ email: null, code: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const current = { ...values, email: values.email ?? urlEmail };

  const set = (field) => (e) => {
    const value = field === "code" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((x) => ({ ...x, [field]: "" }));
    setServerError("");
  };

  async function submit(e) {
    e.preventDefault();
    const result = validate(current, RULES);
    setErrors(result.errors);
    if (!result.isValid) return;
    setIsBusy(true);
    try {
      const data = await resetPassword({ email: current.email.trim(), code: current.code.trim(), newPassword: current.newPassword });
      if (isAuthenticated) await logout(); // every session ended server-side; clear this tab too
      setDone(data.message);
    } catch (err) {
      setServerError(`${err.message}${err.status === 429 ? retryAfterText(err) : ""}`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div>
      <h2 className={`${brandSerif.className} m-0 text-[1.6rem] sm:text-[1.8rem] font-bold text-heading`}>Choose a new password</h2>
      <p className="m-0 mt-1.5 text-sm sm:text-[0.9375rem] text-muted">Enter the code from your reset email and a new password.</p>
      {done ? (
        <div className="mt-6 space-y-4">
          <FormMessage tone="success">{done}</FormMessage>
          <Button href="/login">Go to login <Icon name="arrow-right" size={16} /></Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <FormMessage tone="error">{serverError}</FormMessage>
          <TextField label="Email Address" name="email" type="email" icon="mail" autoComplete="email" value={current.email} onChange={set("email")} error={errors.email} required />
          <TextField label="Reset Code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={current.code} onChange={set("code")} error={errors.code} placeholder="6-digit code" required />
          <TextField label="New Password" name="newPassword" type="password" icon="lock" autoComplete="new-password" value={current.newPassword} onChange={set("newPassword")} error={errors.newPassword} hint="At least 8 characters, with a letter and a number." required />
          <TextField label="Confirm New Password" name="confirm" type="password" icon="lock" autoComplete="new-password" value={current.confirm} onChange={set("confirm")} error={errors.confirm} required />
          <Button type="submit" size="lg" block disabled={isBusy}>{isBusy ? "Saving…" : "Reset Password"}</Button>
          <p className="m-0 text-center text-sm text-muted">
            Need a new code? <Link href="/login" className="font-medium text-forest">Use &ldquo;Forgot password&rdquo;</Link>
          </p>
        </form>
      )}
    </div>
  );
}
