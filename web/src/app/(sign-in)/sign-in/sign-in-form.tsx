"use client";

import { PenLine } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { InputOtp } from "@/components/ui/input-otp";
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

interface Props {
  next: string;
  needsName: boolean;
  nonce: string;
}

export function SignInForm({ next, needsName, nonce }: Props) {
  const t = useTranslations("signIn");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>(needsName ? "name" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
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

  // The code email, and the User a first sign-in creates, take the page's
  // language rather than the browser's (ADR 0047).
  const inPageLanguage = { headers: { "Accept-Language": locale } };

  // Resolves to the call's data, or null once its error is shown.
  async function call<T>(action: () => Promise<{ data: T | null; error: AuthError | null }>) {
    setPending(true);
    setError(null);
    try {
      const { data, error } = await action();
      if (error) {
        setError(t(errorKey(error)));
        return null;
      }
      return data;
    } catch {
      // Better Auth's client throws, rather than returning an error, when
      // the request never reaches the API.
      setError(t("errors.unexpected"));
      return null;
    } finally {
      setPending(false);
    }
  }

  async function sendCode() {
    if (await call(() => authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }, inPageLanguage))) {
      setStep("code");
      setCode("");
      setResendIn(RESEND_AFTER_SECONDS);
    }
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendCode();
  }

  async function signIn(otp: string) {
    const data = await call(() => authClient.signIn.emailOtp({ email, otp }, inPageLanguage));
    if (!data) {
      setCode("");
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
    void signIn(code);
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
    <p role="alert" className="text-center text-p-sm text-red-700">
      {error}
    </p>
  );

  if (step === "email") {
    return (
      <form key="email" onSubmit={submitEmail}>
        <StepHeader title={t("title")}>{t("emailIntro")}</StepHeader>
        <div className="flex flex-col gap-4.5">
          <label>
            <span className="sr-only">{t("email")}</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              autoFocus
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </label>
          {errorMessage}
          <button type="submit" disabled={pending} className={buttonClass}>
            {t("continue")}
          </button>
        </div>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form key="code" onSubmit={submitCode}>
        <StepHeader title={t("codeTitle")}>
          {t.rich("codeIntro", {
            email: () => (
              <>
                <br />
                <ChangeableEmail email={email} hint={t("changeEmail")} onClick={changeEmail} />
              </>
            ),
          })}
        </StepHeader>
        <div className="flex flex-col gap-4.5">
          <InputOtp
            length={CODE_LENGTH}
            value={code}
            onChange={setCode}
            // Never disabled while checking: it would lose focus, and a wrong
            // code should leave the cursor in the first box.
            onComplete={(otp) => void signIn(otp)}
            nonce={nonce}
            aria-label={t("code")}
          />
          {errorMessage}
          <button type="submit" disabled={pending || code.length < CODE_LENGTH} className={buttonClass}>
            {t("signIn")}
          </button>
        </div>
        <p className="mt-5 text-center text-label-sm text-balance text-muted">
          {t.rich("notReceived", {
            resend: () => (
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={pending || resendIn > 0}
                className={`${linkClass} tabular-nums disabled:text-muted`}
              >
                {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
              </button>
            ),
          })}
        </p>
      </form>
    );
  }

  return (
    <form key="name" onSubmit={submitName}>
      <StepHeader title={t("nameTitle")}>{t("nameIntro")}</StepHeader>
      <div className="flex flex-col gap-4.5">
        <label>
          <span className="sr-only">{t("name")}</span>
          <input
            name="name"
            required
            // Spaces alone would be saved as an empty name.
            pattern=".*\S.*"
            autoComplete="name"
            autoFocus
            placeholder={t("namePlaceholder")}
            className={inputClass}
          />
        </label>
        {errorMessage}
        <button type="submit" disabled={pending} className={buttonClass}>
          {t("continue")}
        </button>
      </div>
    </form>
  );
}

// The sign-in controls of ADR 0049: 48px, rounded-xl, one block with the form.
const inputClass =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-label-md text-ink transition-colors placeholder:text-muted/70 hover:border-border-strong focus:border-highlight focus-visible:outline-none";
const buttonClass =
  "h-12 w-full rounded-xl bg-ink text-label-sm text-surface transition-colors hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-60";
const linkClass = "text-label-sm text-brand-text transition-colors hover:text-ink";

function StepHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-7 text-center">
      <h1 className="font-display text-title-h4">{title}</h1>
      <p className="mt-2 text-p-md text-balance text-muted">{children}</p>
    </div>
  );
}

// The address a code went to, which a click on it, or on the hint that shows
// under it, changes. The hint is inside the button, so it's part of its name.
function ChangeableEmail({ email, hint, onClick }: { email: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative font-medium break-all text-brand-text transition-colors hover:text-ink"
    >
      {email}
      <span className="pointer-events-none absolute top-full left-1/2 z-10 mt-2 flex -translate-x-1/2 -translate-y-1 items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-label-xs whitespace-nowrap text-surface opacity-0 shadow-float transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 before:absolute before:inset-x-0 before:bottom-full before:h-2 after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-ink">
        <PenLine aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        {hint}
      </span>
    </button>
  );
}
