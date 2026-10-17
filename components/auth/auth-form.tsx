"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

type Mode = "login" | "signup";

interface AuthFormProps {
  mode: Mode;
  next?: string;
  notice?: string;
}

interface ApiResult {
  ok?: boolean;
  redirectTo?: string;
  error?: string;
  fields?: { email?: string; password?: string };
}

const COPY: Record<Mode, { submit: string; pending: string; alt: string; altHref: string; altLabel: string }> = {
  login: {
    submit: "Sign in",
    pending: "Signing in",
    alt: "New to Your Orbit?",
    altHref: "/signup",
    altLabel: "Create an account",
  },
  signup: {
    submit: "Create account",
    pending: "Creating account",
    alt: "Already have an account?",
    altHref: "/login",
    altLabel: "Sign in",
  },
};

const inputClass =
  "mt-2 block w-full border border-rule bg-transparent px-3.5 py-3 font-sans text-[15px] text-ink placeholder:text-ink-muted/60 transition-colors duration-300 hover:border-ink focus-visible:border-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy aria-[invalid=true]:border-burgundy";

export function AuthForm({ mode, next, notice }: AuthFormProps) {
  const router = useRouter();
  const copy = COPY[mode];
  const emailId = useId();
  const passwordId = useId();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    notice === "google-unavailable"
      ? "Google sign-in is not available yet. Use your email and password."
      : null,
  );
  const [fieldErrors, setFieldErrors] = useState<NonNullable<ApiResult["fields"]>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          next,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as ApiResult;

      if (response.ok && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
        return;
      }

      setFieldErrors(result.fields ?? {});
      setFormError(result.error ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {formError && (
        <p
          role="alert"
          className="mb-6 border-l-2 border-burgundy bg-burgundy/5 px-4 py-3 font-sans text-sm text-burgundy motion-safe:animate-fade-in"
        >
          {formError}
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <div>
          <label htmlFor={emailId} className="font-sans text-xs font-medium uppercase tracking-[0.12em] text-ink">
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
            className={inputClass}
          />
          {fieldErrors.email && (
            <p id={`${emailId}-error`} className="mt-2 font-sans text-[13px] text-burgundy">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={passwordId} className="font-sans text-xs font-medium uppercase tracking-[0.12em] text-ink">
            Password
          </label>
          <input
            id={passwordId}
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              [mode === "signup" ? `${passwordId}-hint` : null, fieldErrors.password ? `${passwordId}-error` : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={inputClass}
          />
          {mode === "signup" && (
            <p id={`${passwordId}-hint`} className="mt-2 font-sans text-[13px] text-ink-muted">
              At least 8 characters.
            </p>
          )}
          {fieldErrors.password && (
            <p id={`${passwordId}-error`} className="mt-2 font-sans text-[13px] text-burgundy">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 bg-ink px-4 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
          <span aria-live="polite">{pending ? copy.pending : copy.submit}</span>
        </button>
      </form>

      <div className="my-8 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-rule" />
        <span className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink-muted">or</span>
        <span className="h-px flex-1 bg-rule" />
      </div>

      <button
        type="button"
        disabled
        aria-describedby="google-soon"
        className="flex w-full cursor-not-allowed items-center justify-center gap-3 border border-rule px-4 py-3.5 font-sans text-[13px] font-medium text-ink-muted opacity-70"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.64 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95S8.78 6.28 12 6.28c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12S6.92 21.2 12 21.2c5.28 0 8.78-3.71 8.78-8.94 0-.6-.07-1.06-.15-1.16z" />
        </svg>
        Continue with Google
        <span id="google-soon" className="sr-only">
          Not available yet
        </span>
      </button>

      <p className="mt-8 text-center font-sans text-sm text-ink-muted">
        {copy.alt}{" "}
        <Link
          href={copy.altHref}
          className="font-medium text-ink underline decoration-burgundy underline-offset-4 transition-colors duration-300 hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          {copy.altLabel}
        </Link>
      </p>
    </div>
  );
}
