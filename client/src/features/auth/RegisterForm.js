"use client";

/**
 * RegisterForm — creates an account through the API. The server emails a 6-digit code; no
 * session starts until the email is verified (see /verify-email). The phone number is optional.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { brandSerif } from "@/app/fonts";
import { email, password, phone, required, validate } from "@/lib/validation";
import { retryAfterText } from "@/lib/api";
import { Checkbox, TextField } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { FormMessage } from "@/components/ui/States";
import { useAuth } from "./AuthProvider";

const RULES = {
  name: required("Full name"),
  email,
  phone: (value) => (String(value ?? "").trim() ? phone(value) : ""), // optional
  password,
  confirm: [required("Password confirmation"), (value, all) => (value === all.password ? "" : "Passwords don't match.")],
  terms: (value) => (value ? "" : "Please accept the terms to continue."),
};

export default function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", phone: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
    setServerError("");
  };

  async function submit(e) {
    e.preventDefault();
    const result = validate(values, RULES);
    setErrors(result.errors);
    if (!result.isValid) {
      const first = Object.keys(RULES).find((f) => result.errors[f]);
      e.currentTarget.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    setIsBusy(true);
    setServerError("");
    try {
      const data = await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
      });
      const sent = data.emailSent === false ? "0" : "1";
      router.push(`/verify-email?${new URLSearchParams({ email: data.user.email, sent })}`);
    } catch (err) {
      if (err.code === "EMAIL_EXISTS") setErrors((x) => ({ ...x, email: err.message }));
      else if (err.code === "PHONE_EXISTS") setErrors((x) => ({ ...x, phone: err.message }));
      else setServerError(`${err.message}${err.status === 429 ? retryAfterText(err) : ""}`);
      setIsBusy(false);
    }
  }

  return (
    <div>
      <h2 className={`${brandSerif.className} m-0 text-[1.6rem] sm:text-[1.8rem] font-bold text-heading`}>Create your account</h2>
      <p className="m-0 mt-1.5 text-sm sm:text-[0.9375rem] text-muted">Start growing with Soil &amp; Soul</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <FormMessage tone="error">{serverError}</FormMessage>
        <TextField label="Full Name" name="name" icon="user" autoComplete="name" value={values.name} onChange={set("name")} error={errors.name} placeholder="Enter your full name" required />
        <TextField label="Email Address" name="email" type="email" icon="mail" autoComplete="email" value={values.email} onChange={set("email")} error={errors.email} placeholder="Enter your email address" required />
        <TextField label="Mobile Number (optional)" name="phone" type="tel" icon="phone" autoComplete="tel" inputMode="tel" value={values.phone} onChange={set("phone")} error={errors.phone} hint="Indian mobile number, used only for your orders." placeholder="98765 43210" />
        <TextField label="Password" name="password" type="password" icon="lock" autoComplete="new-password" value={values.password} onChange={set("password")} error={errors.password} hint="At least 8 characters, with a letter and a number." placeholder="Create a password" required />
        <TextField label="Confirm Password" name="confirm" type="password" icon="lock" autoComplete="new-password" value={values.confirm} onChange={set("confirm")} error={errors.confirm} placeholder="Re-enter your password" required />
        <div>
          <Checkbox
            name="terms"
            checked={values.terms}
            onChange={set("terms")}
            label={<span>I agree to the <Link href="/terms" className="text-forest">Terms</Link> and <Link href="/privacy-policy" className="text-forest">Privacy Policy</Link></span>}
          />
          {errors.terms && <p className="m-0 mt-1 text-xs text-danger" role="alert">{errors.terms}</p>}
        </div>
        <Button type="submit" size="lg" block disabled={isBusy}>
          {isBusy ? "Creating account…" : <>Create Account <Icon name="arrow-right" size={17} /></>}
        </Button>
      </form>

      <p className="m-0 mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-forest no-underline hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
