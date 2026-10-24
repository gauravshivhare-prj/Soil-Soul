"use client";

/**
 * LoginForm — email/password sign-in against the API, plus the "Forgot password" step.
 * Server responses decide everything: wrong credentials, unverified email, disabled account
 * and lockouts are shown with the server's safe messages.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { brandSerif } from "@/app/fonts";
import { email, required, validate } from "@/lib/validation";
import { retryAfterText } from "@/lib/api";
import { TextField } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { FormMessage } from "@/components/ui/States";
import { useAuth } from "./AuthProvider";

function focusFirstError(form, errors, order) {
  const first = order.find((f) => errors[f]);
  form.querySelector(`[name="${first}"]`)?.focus();
}

/** Where to go after sign-in: a safe same-site `next` path, else the role's home. */
export function postLoginPath(user) {
  if (typeof window !== "undefined") {
    const next = new URLSearchParams(window.location.search).get("next");
    // Same-site paths only: browsers treat "/\host" like "//host", so backslashes are refused too.
    if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) return next;
  }
  return user?.role === "admin" ? "/admin" : "/account";
}

function ForgotPassword({ onBack, initialEmail }) {
  const { forgotPassword } = useAuth();
  const [value, setValue] = useState(initialEmail);
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const message = email(value);
    setError(message);
    if (message) return e.currentTarget.querySelector("input")?.focus();
    setIsBusy(true);
    try {
      const data = await forgotPassword(value.trim());
      setSentMessage(data.message);
    } catch (err) {
      setError(`${err.message}${retryAfterText(err)}`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div>
      <h2 className={`${brandSerif.className} m-0 text-[1.6rem] font-bold text-heading`}>Reset your password</h2>
      <p className="m-0 mt-1.5 text-sm text-muted">Enter your account email and we&rsquo;ll send you a 6-digit reset code.</p>
      {sentMessage ? (
        <div className="mt-6 space-y-4">
          <FormMessage tone="success">{sentMessage}</FormMessage>
          <div className="flex flex-wrap gap-2.5">
            <Button href={`/reset-password?email=${encodeURIComponent(value.trim())}`}>Enter reset code <Icon name="arrow-right" size={16} /></Button>
            <Button variant="outline" onClick={onBack}><Icon name="arrow-left" size={16} />Back to login</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <TextField label="Email Address" name="email" type="email" icon="mail" autoComplete="email" value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} error={error} placeholder="Enter your email address" required />
          <Button type="submit" size="lg" block disabled={isBusy}>{isBusy ? "Sending…" : "Send Reset Code"}</Button>
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
  const { login } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [mode, setMode] = useState("login"); // "login" | "forgot"
  const [serverError, setServerError] = useState(null); // { message, verifyEmail? }
  const [isBusy, setIsBusy] = useState(false);

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
    setServerError(null);
  };

  async function submit(e) {
    e.preventDefault();
    const result = validate(values, RULES);
    setErrors(result.errors);
    if (!result.isValid) return focusFirstError(e.currentTarget, result.errors, Object.keys(RULES));
    setIsBusy(true);
    setServerError(null);
    try {
      const user = await login(values.email.trim(), values.password);
      router.push(postLoginPath(user));
    } catch (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") setServerError({ message: err.message, verifyEmail: values.email.trim() });
      else setServerError({ message: `${err.message}${err.status === 429 ? retryAfterText(err) : ""}` });
      setIsBusy(false);
    }
  }

  if (mode === "forgot") return <ForgotPassword onBack={() => setMode("login")} initialEmail={values.email} />;

  return (
    <div>
      <h2 className={`${brandSerif.className} m-0 text-[1.6rem] sm:text-[1.8rem] font-bold text-heading`}>Welcome Back</h2>
      <p className="m-0 mt-1.5 text-sm sm:text-[0.9375rem] text-muted">Sign in to continue your green journey</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {serverError && (
          <FormMessage tone="error">
            {serverError.message}
            {serverError.verifyEmail && (
              <>
                {" "}
                <Link href={`/verify-email?email=${encodeURIComponent(serverError.verifyEmail)}`} className="font-semibold text-forest">
                  Verify your email
                </Link>
              </>
            )}
          </FormMessage>
        )}
        <TextField label="Email Address" name="email" type="email" icon="mail" autoComplete="email" value={values.email} onChange={set("email")} error={errors.email} placeholder="Enter your email address" required />
        <TextField label="Password" name="password" type="password" icon="lock" autoComplete="current-password" value={values.password} onChange={set("password")} error={errors.password} placeholder="Enter your password" required />
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => setMode("forgot")} className="bg-transparent border-0 p-0 text-sm font-medium text-forest cursor-pointer hover:underline">
            Forgot password?
          </button>
        </div>
        <Button type="submit" size="lg" block disabled={isBusy}>
          {isBusy ? "Signing in…" : <>Sign In <Icon name="arrow-right" size={17} /></>}
        </Button>
      </form>

      <p className="m-0 mt-6 text-center text-sm text-muted">
        Don&rsquo;t have an account?{" "}
        <Link href="/register" className="font-semibold text-forest no-underline hover:underline">Create one</Link>
      </p>
    </div>
  );
}
