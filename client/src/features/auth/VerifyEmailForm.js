"use client";

/**
 * VerifyEmailForm — enter the 6-digit code emailed at sign-up (or request a new one).
 * A successful verification starts the session. Resend always shows the same generic
 * message, so it reveals nothing about which emails have accounts.
 */

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { brandSerif } from "@/app/fonts";
import { email as emailRule } from "@/lib/validation";
import { retryAfterText } from "@/lib/api";
import { TextField } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { FormMessage } from "@/components/ui/States";
import { useAuth } from "./AuthProvider";
import { postLoginPath } from "./LoginForm";

const noop = () => () => {};
export function useQueryParam(name) {
  const search = useSyncExternalStore(noop, () => window.location.search, () => "");
  return new URLSearchParams(search).get(name) ?? "";
}

const codeError = (value) => (/^\d{6}$/.test(value.trim()) ? "" : "Enter the 6-digit code from the email.");

export default function VerifyEmailForm() {
  const { verifyEmail, resendVerification } = useAuth();
  const router = useRouter();
  const urlEmail = useQueryParam("email");
  const notSent = useQueryParam("sent") === "0";
  const [emailInput, setEmailInput] = useState(null);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // { tone, text }
  const [isBusy, setIsBusy] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const emailValue = emailInput ?? urlEmail;

  async function submit(e) {
    e.preventDefault();
    const next = { email: emailRule(emailValue), code: codeError(code) };
    setErrors(next);
    if (next.email || next.code) return;
    setIsBusy(true);
    setMessage(null);
    try {
      const user = await verifyEmail(emailValue.trim(), code.trim());
      router.push(postLoginPath(user));
    } catch (err) {
      setMessage({ tone: "error", text: `${err.message}${err.status === 429 ? retryAfterText(err) : ""}` });
      setIsBusy(false);
    }
  }

  async function resend() {
    const emailError = emailRule(emailValue);
    setErrors((x) => ({ ...x, email: emailError }));
    if (emailError) return;
    setIsResending(true);
    try {
      const data = await resendVerification(emailValue.trim());
      setMessage({ tone: "success", text: `${data.message} Codes can be resent once a minute.` });
    } catch (err) {
      setMessage({ tone: "error", text: `${err.message}${retryAfterText(err)}` });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div>
      <h2 className={`${brandSerif.className} m-0 text-[1.6rem] sm:text-[1.8rem] font-bold text-heading`}>Verify your email</h2>
      <p className="m-0 mt-1.5 text-sm sm:text-[0.9375rem] text-muted">
        {notSent ? "Enter the 6-digit code from your verification email." : "Enter the 6-digit code we sent to your email."} Codes expire in 10 minutes.
      </p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {notSent && !message && (
          <FormMessage tone="info">Your account was created, but the email could not be sent. Use &ldquo;Send a new code&rdquo; below.</FormMessage>
        )}
        {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
        <TextField label="Email Address" name="email" type="email" icon="mail" autoComplete="email" value={emailValue} onChange={(e) => { setEmailInput(e.target.value); setErrors((x) => ({ ...x, email: "" })); }} error={errors.email} placeholder="Enter your email address" required />
        <TextField label="Verification Code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErrors((x) => ({ ...x, code: "" })); }} error={errors.code} placeholder="6-digit code" required />
        <Button type="submit" size="lg" block disabled={isBusy}>
          {isBusy ? "Verifying…" : <>Verify &amp; Continue <Icon name="arrow-right" size={17} /></>}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" onClick={resend} disabled={isResending} className="bg-transparent border-0 p-0 font-medium text-forest cursor-pointer hover:underline disabled:opacity-55">
            {isResending ? "Sending…" : "Send a new code"}
          </button>
          <Link href="/login" className="font-medium text-forest no-underline hover:underline">Back to login</Link>
        </div>
      </form>
    </div>
  );
}
