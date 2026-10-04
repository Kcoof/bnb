"use client";

import { useState } from "react";
import {
  googleSignInAction,
  sendOtpAction,
  verifyOtpAction,
  signInPasswordAction,
} from "@/app/actions/auth";
import { Icon } from "@/components/Icon";

// AUTOMI login (spec §1): Google primary, email OTP fallback, no passwords.
export default function LoginPage() {
  const [mode, setMode] = useState<"start" | "otp" | "password">("start");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("error")
      : null,
  );
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSendOtp() {
    setPending(true);
    setError(null);
    setInfo(null);
    const result = await sendOtpAction({ email });
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setMode("otp");
      setInfo("We sent a 6-digit code to " + email + ". It arrives in under a minute.");
    }
  }

  async function onVerifyOtp() {
    setPending(true);
    setError(null);
    const result = await verifyOtpAction({ email, token });
    setPending(false);
    if (result?.error) setError(result.error);
  }

  async function onPassword() {
    setPending(true);
    setError(null);
    const result = await signInPasswordAction({ email, password });
    setPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-[400px] animate-fade-up">
        <div className="flex justify-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-ink text-sm font-semibold text-white">
            A
          </span>
        </div>
        <h1 className="mt-5 text-center text-title-1">Sign in to AUTOMI</h1>
        <p className="mt-1.5 text-center text-callout text-ink-2">
          No passwords — Google or a one-time code.
        </p>

        {mode === "start" && (
          <div className="mt-8 space-y-3">
            <form action={googleSignInAction}>
              <button
                type="submit"
                disabled={pending}
                className="btn btn-secondary btn-lg w-full"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.3 3.8l3.6 2.8c2.1-2 3.7-4.9 3.7-8.5z" />
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.8-2.9l-3.6-2.8c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.2-7-5.1L1.3 17c1.9 3.9 6 7 10.7 7z" />
                  <path fill="#FBBC05" d="M5 14.4c-.3-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4L1.3 6.7C.5 8.3 0 10.1 0 12s.5 3.7 1.3 5.3L5 14.4z" />
                  <path fill="#EA4335" d="M12 4.8c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.3 0 3.2 3.1 1.3 6.7L5 9.6c1-2.9 3.8-4.8 7-4.8z" />
                </svg>
                Continue with Google
              </button>
            </form>

            <div className="flex items-center gap-3 py-2">
              <span className="h-px flex-1 bg-hairline" />
              <span className="text-caption-1 text-ink-3">or</span>
              <span className="h-px flex-1 bg-hairline" />
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="input h-12"
                onKeyDown={(e) => e.key === "Enter" && onSendOtp()}
              />
            </div>
            <button
              onClick={onSendOtp}
              disabled={pending || !email.includes("@")}
              className="btn btn-primary btn-lg w-full"
            >
              {pending ? <span className="spinner" /> : null}
              Email me a code
            </button>
            {(process.env.NEXT_PUBLIC_ALLOW_PASSWORD_LOGIN ?? "true") !== "false" && (
              <button
                onClick={() => setMode("password")}
                className="mx-auto block text-footnote text-ink-3 hover:text-ink"
              >
                Have an old password? Use it instead
              </button>
            )}
          </div>
        )}

        {mode === "otp" && (
          <div className="mt-8 space-y-4">
            {info && <p className="text-center text-footnote text-ink-2">{info}</p>}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">6-digit code</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoFocus
                placeholder="123456"
                className="input h-14 text-center text-[24px] tracking-[0.3em]"
                onKeyDown={(e) => e.key === "Enter" && onVerifyOtp()}
              />
            </div>
            <button
              onClick={onVerifyOtp}
              disabled={pending || token.length !== 6}
              className="btn btn-primary btn-lg w-full"
            >
              {pending ? <span className="spinner" /> : null}
              Verify and sign in
            </button>
            <button
              onClick={() => setMode("start")}
              className="mx-auto block text-callout text-accent hover:underline"
            >
              ‹ Use a different email
            </button>
          </div>
        )}

        {mode === "password" && (
          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="input h-12"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="input h-12"
                onKeyDown={(e) => e.key === "Enter" && onPassword()}
              />
            </div>
            <button
              onClick={onPassword}
              disabled={pending || !email || !password}
              className="btn btn-primary btn-lg w-full"
            >
              {pending ? <span className="spinner" /> : null}
              Sign in
            </button>
            <button
              onClick={() => setMode("start")}
              className="mx-auto block text-callout text-accent hover:underline"
            >
              ‹ Back to Google / email code
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 flex items-start gap-1.5 text-footnote text-danger">
            <Icon name="alertCircle" size={14} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
