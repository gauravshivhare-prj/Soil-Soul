"use client";

/**
 * RegisterForm — name, email, password and confirmation with client-side
 * validation. DEMO ONLY: no account is created and nothing is stored.
 */

import { useState } from "react";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { email, password, required, validate } from "@/lib/validation";
import { Checkbox, TextField } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { DemoNotice } from "@/components/ui/States";
import SocialButtons from "./SocialButtons";

const RULES = {
  name: required("Full name"),
  email,
  password,
  confirm: [required("Password confirmation"), (value, all) => (value === all.password ? "" : "Passwords don't match.")],
  terms: (value) => (value ? "" : "Please accept the terms to continue."),
};

export default function RegisterForm() {
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState({});
  const [isDone, setIsDone] = useState(false);

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
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
    setIsDone(true);
  }

  return (
    <div>
      <h2 className={`${brandSerif.className} m-0 text-[1.6rem] sm:text-[1.8rem] font-bold text-heading`}>Create your account</h2>
      <p className="m-0 mt-1.5 text-sm sm:text-[0.9375rem] text-muted">Start growing with Soil &amp; Soul</p>

      {isDone ? (
        <div className="mt-6 space-y-4" role="status">
          <DemoNotice>
            Demo mode: registration isn&rsquo;t connected to the server yet, so no account was created for <strong>{values.email}</strong>.
          </DemoNotice>
          <Button href="/login" variant="outline"><Icon name="arrow-left" size={16} />Go to Login</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <TextField label="Full Name" name="name" icon="user" autoComplete="name" value={values.name} onChange={set("name")} error={errors.name} placeholder="Enter your full name" required />
          <TextField label="Email Address" name="email" type="email" icon="mail" autoComplete="email" value={values.email} onChange={set("email")} error={errors.email} placeholder="Enter your email address" required />
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
          <Button type="submit" size="lg" block>
            Create Account <Icon name="arrow-right" size={17} />
          </Button>
        </form>
      )}

      <SocialButtons />

      <p className="m-0 mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-forest no-underline hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
