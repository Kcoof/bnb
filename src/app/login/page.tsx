"use client";

import { useState } from "react";
import { signInAction, signUpAction } from "@/app/actions/auth";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result =
      mode === "signin"
        ? await signInAction({
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
          })
        : await signUpAction({
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
            fullName: String(formData.get("fullName") ?? ""),
            orgName: String(formData.get("orgName") ?? ""),
          });
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
        <h1 className="mt-5 text-center text-title-1">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-1.5 text-center text-callout text-ink-2">
          AI operations for short-term rental managers
        </p>

        <form action={onSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink">
                  Your name
                </label>
                <input name="fullName" required className="input h-12" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink">
                  Company / team name
                </label>
                <input name="orgName" required placeholder="Acme Stays" className="input h-12" />
              </div>
            </>
          )}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Email</label>
            <input name="email" type="email" required className="input h-12" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="input h-12"
            />
          </div>

          {error && (
            <p className="flex items-start gap-1.5 text-footnote text-danger">
              <Icon name="alertCircle" size={14} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary btn-lg w-full"
          >
            {pending && <span className="spinner" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-center text-callout text-accent hover:underline"
        >
          {mode === "signin"
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
