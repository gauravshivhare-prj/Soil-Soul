"use client";

/**
 * LoginForm — email/password sign-in with client-side validation and a
 * "Forgot password" state.
 *
 * DEMO ONLY: nothing is sent to a server, no session or token is created.
 * Valid submissions show a notice that authentication isn't connected yet.
 */

import { useState } from "react";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { email, required, validate } from "@/lib/validation";
import { Checkbox, TextField } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { DemoNotice } from "@/components/ui/States";
import SocialButtons from "./SocialButtons";

function focusFirstError(form, errors, order) {
  const first = order.find((f) => errors[f]);
  form.querySelector(`[name="${first}"]`)?.focus();
}

function ForgotPassword({ onBack }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isSent, setIsSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    const message = email(value);
    setError(message);
    if (message) return e.currentTarget.querySelector("input")?.focus();
    setIsSent(true);
  }

  return (
    <div>
      <h2 className={`${brandSerif.className} m-0 text-[1.6rem] font-bold text-heading`}>Reset your password</h2>
      <p className="m-0 mt-1.5 text-sm text-muted">Enter your account email and we&rsquo;ll send you a reset link.</p>
      {isSent ? (
        <div className="mt-6 space-y-4" role="status">
          <DemoNotice>
            Demo mode: password reset isn&rsquo;t connected yet, so no email was sent to <strong>{value}</strong>.
          </DemoNotice>
          <Button variant="outline" onClick={onBack}><Icon name="arrow-left" size={16} />Back to login</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <TextField label="Email Address" name="email" type="email" icon="mail" autoComplete="email" value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} error={error} placeholder="Enter your email address" required />
          <Button type="submit" size="lg" block>Send Reset Link</Button>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-sm font-medium text-forest cursor-pointer hover:underline">
            <Icon name="arrow-left" size={15} /> Back to login
          </button>
        </form>
      )}
    </div>
  );
}

const RULES = { email, password: required("Password") };

export default function LoginForm() {
  const [values, setValues] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState({});
  const [mode, setMode] = useState("login"); // "login" | "forgot" | "done"

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
  };

  function submit(e) {
    e.preventDefault();
    const result = validate(values, RULES);
    setErrors(result.errors);
    if (!result.isValid) return focusFirstError(e.currentTarget, result.errors, Object.keys(RULES));
    setMode("done");
  }

  if (mode === "forgot") return <ForgotPassword onBack={() => setMode("login")} />;

  return (
    <div>
      <h2 className={`${brandSerif.className} m-0 text-[1.6rem] sm:text-[1.8rem] font-bold text-heading`}>Welcome Back</h2>
      <p className="m-0 mt-1.5 text-sm sm:text-[0.9375rem] text-muted">Sign in to continue your green journey</p>

      {mode === "done" ? (
        <div className="mt-6 space-y-4" role="status">
          <DemoNotice>
            Demo mode: sign-in isn&rsquo;t connected to the server yet, so you haven&rsquo;t been signed in. You can still explore the demo account pages.
          </DemoNotice>
          <div className="flex flex-wrap gap-2.5">
            <Button href="/account">Open Demo Account <Icon name="arrow-right" size={16} /></Button>
            <Button variant="outline" onClick={() => setMode("login")}>Back</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <TextField label="Email Address" name="email" type="email" icon="mail" autoComplete="email" value={values.email} onChange={set("email")} error={errors.email} placeholder="Enter your email address" required />
          <TextField label="Password" name="password" type="password" icon="lock" autoComplete="current-password" value={values.password} onChange={set("password")} error={errors.password} placeholder="Enter your password" required />
          <div className="flex items-center justify-between gap-3">
            <Checkbox label="Remember me" checked={values.remember} onChange={set("remember")} />
            <button type="button" onClick={() => setMode("forgot")} className="bg-transparent border-0 p-0 text-sm font-medium text-forest cursor-pointer hover:underline">
              Forgot password?
            </button>
          </div>
          <Button type="submit" size="lg" block>
            Sign In <Icon name="arrow-right" size={17} />
          </Button>
        </form>
      )}

      <SocialButtons />

      <p className="m-0 mt-6 text-center text-sm text-muted">
        Don&rsquo;t have an account?{" "}
        <Link href="/register" className="font-semibold text-forest no-underline hover:underline">Create one</Link>
      </p>
    </div>
  );
}
