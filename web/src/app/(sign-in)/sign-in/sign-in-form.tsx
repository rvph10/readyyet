"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type Step = "email" | "code" | "name";

// Better Auth's codes are 6 digits. Waiting before a resend keeps an
// impatient visitor under the API's 10 codes a minute (ADR 0011).
const CODE_LENGTH = 6;
const RESEND_AFTER_SECONDS = 30;

interface AuthError {
  status: number;
  code?: string;
}

function errorKey(error: AuthError) {
  if (error.status === 429) {
    return "errors.rateLimited";
  }
  switch (error.code) {
    case "INVALID_OTP":
      return "errors.invalidCode";
    case "OTP_EXPIRED":
    case "TOO_MANY_ATTEMPTS":
      return "errors.expiredCode";
    default:
      return "errors.unexpected";
  }
}

export function SignInForm({ next, needsName }: { next: string; needsName: boolean }) {
  const t = useTranslations("signIn");
  const router = useRouter();
  const [step, setStep] = useState<Step>(needsName ? "name" : "email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn === 0) {
      return;
    }
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Resolves to the call's data, or null once its error is shown.
  async function call<T>(action: () => Promise<{ data: T | null; error: AuthError | null }>) {
    setPending(true);
    setError(null);
    const { data, error } = await action();
    setPending(false);
    if (error) {
      setError(t(errorKey(error)));
      return null;
    }
    return data;
  }

  async function sendCode() {
    if (await call(() => authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }))) {
      setStep("code");
      setResendIn(RESEND_AFTER_SECONDS);
    }
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendCode();
  }

  async function signIn(otp: string) {
    const data = await call(() => authClient.signIn.emailOtp({ email, otp }));
    if (!data) {
      return;
    }
    // A first sign-in creates the User without a name (ADR 0011).
    if (data.user.name) {
      router.replace(next);
    } else {
      setStep("name");
    }
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn(new FormData(event.currentTarget).get("code") as string);
  }

  async function saveName(name: string) {
    if (await call(() => authClient.updateUser({ name }))) {
      router.replace(next);
    }
  }

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveName((new FormData(event.currentTarget).get("name") as string).trim());
  }

  function changeEmail() {
    setStep("email");
    setError(null);
  }

  const errorMessage = error && (
    <p role="alert" className="text-sm text-red-700">
      {error}
    </p>
  );

  if (step === "email") {
    return (
      <form key="email" onSubmit={submitEmail} className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted">{t("emailIntro")}</p>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("email")}</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border border-border bg-surface px-3 py-2"
          />
        </label>
        {errorMessage}
        <button type="submit" disabled={pending} className="rounded bg-ink px-3 py-2 text-surface disabled:opacity-60">
          {t("continue")}
        </button>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form key="code" onSubmit={submitCode} className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{t("codeTitle")}</h1>
        <p className="text-muted">{t("codeIntro", { email })}</p>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("code")}</span>
          <input
            name="code"
            required
            autoComplete="one-time-code"
            autoFocus
            inputMode="numeric"
            pattern={`[0-9]{${CODE_LENGTH}}`}
            maxLength={CODE_LENGTH}
            className="rounded border border-border bg-surface px-3 py-2 font-mono tracking-widest"
          />
        </label>
        {errorMessage}
        <button type="submit" disabled={pending} className="rounded bg-ink px-3 py-2 text-surface disabled:opacity-60">
          {t("signIn")}
        </button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={changeEmail} className="underline">
            {t("changeEmail")}
          </button>
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={pending || resendIn > 0}
            className="underline disabled:no-underline disabled:opacity-60"
          >
            {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form key="name" onSubmit={submitName} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("nameTitle")}</h1>
      <p className="text-muted">{t("nameIntro")}</p>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("name")}</span>
        <input
          name="name"
          required
          autoComplete="name"
          autoFocus
          className="rounded border border-border bg-surface px-3 py-2"
        />
      </label>
      {errorMessage}
      <button type="submit" disabled={pending} className="rounded bg-ink px-3 py-2 text-surface disabled:opacity-60">
        {t("continue")}
      </button>
    </form>
  );
}
