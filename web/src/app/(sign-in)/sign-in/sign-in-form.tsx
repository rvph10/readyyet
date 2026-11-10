"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, validityMessage } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { InputOtp } from "@/components/ui/input-otp";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";
import { COOKIE_MAX_AGE_SECONDS } from "@/lib/consent";

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
    case "INVALID_EMAIL":
      return "errors.emailInvalid";
    case "DISPOSABLE_EMAIL":
      return "errors.disposableEmail";
    default:
      return "errors.unexpected";
  }
}

type Messages = Parameters<typeof validityMessage>[1];

// The API's refusals that are about what was typed in the step's field, so
// they show under it rather than above the button.
const FIELD_ERROR_CODES = new Set(["INVALID_EMAIL", "DISPOSABLE_EMAIL", "INVALID_OTP"]);

interface Props {
  next: string;
  needsName: boolean;
  // The address a code was already sent to, which opens on the code step.
  sentTo?: string;
  nonce: string;
}

export function SignInForm({ next, needsName, sentTo, nonce }: Props) {
  const t = useTranslations("signIn");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>(needsName ? "name" : sentTo ? "code" : "email");
  const [email, setEmail] = useState(sentTo ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Which call is running, so only its button says so.
  const [busy, setBusy] = useState<"sendCode" | "signIn" | "saveName" | null>(null);
  const pending = busy !== null;
  const [resendIn, setResendIn] = useState(sentTo ? RESEND_AFTER_SECONDS : 0);

  // Coming back from Stripe, iOS Safari can leave the session cookie off the first
  // request, which is what brought a signed-in User here. This call carries it.
  useEffect(() => {
    void authClient.getSession().then(({ data }) => {
      if (data) window.location.replace(next);
    });
  }, [next]);

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

  const emailMessages = { valueMissing: t("errors.emailMissing"), typeMismatch: t("errors.emailInvalid") };
  const nameMessages = { valueMissing: t("errors.nameMissing"), patternMismatch: t("errors.nameMissing") };

  // Checked on submit, then again as it's typed while an error shows, so the
  // message goes as soon as the value is right, but never appears mid-word.
  function recheck(event: ChangeEvent<HTMLInputElement>, messages: Messages) {
    if (fieldError) {
      setFieldError(validityMessage(event.target, messages));
    }
  }

  // The field's own check, before anything is sent. Focuses it when it fails.
  function fieldIsValid(input: HTMLInputElement, messages: Messages) {
    const message = validityMessage(input, messages);
    setFieldError(message);
    if (message) {
      input.focus();
    }
    return !message;
  }

  // Resolves to the call's data, or null once its error is shown.
  async function call<T>(
    kind: NonNullable<typeof busy>,
    action: () => Promise<{ data: T | null; error: AuthError | null }>,
  ) {
    setBusy(kind);
    setError(null);
    try {
      const { data, error } = await action();
      if (error) {
        (FIELD_ERROR_CODES.has(error.code ?? "") ? setFieldError : setError)(t(errorKey(error)));
        return null;
      }
      return data;
    } catch {
      // Better Auth's client throws, rather than returning an error, when
      // the request never reaches the API.
      setError(t("errors.unreachable"));
      return null;
    } finally {
      setBusy(null);
    }
  }

  // Resolves to whether the code went out.
  async function sendCode() {
    const sent = await call("sendCode", () =>
      authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }, inPageLanguage),
    );
    if (sent) {
      setStep("code");
      setCode("");
      setResendIn(RESEND_AFTER_SECONDS);
    }
    return Boolean(sent);
  }

  // A new code changes nothing on the page but the countdown, so a toast
  // says it went (ADR 0062).
  async function resendCode() {
    if (await sendCode()) {
      toast({ message: t("codeResent", { email }) });
    }
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fieldIsValid(event.currentTarget.elements.namedItem("email") as HTMLInputElement, emailMessages)) {
      void sendCode();
    }
  }

  async function signIn(otp: string) {
    const data = await call("signIn", () => authClient.signIn.emailOtp({ email, otp }, inPageLanguage));
    if (!data) {
      setCode("");
      return;
    }
    // A first sign-in creates the User without a name (ADR 0011).
    if (data.user.name) {
      // ADR 0118: the app speaks the User's own language, on this device too.
      const saved = parseLocale((data.user as { locale?: string }).locale);
      if (saved && saved.toLowerCase() !== locale) {
        document.cookie = `${LOCALE_COOKIE}=${saved}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
        // A full load, as the root layout holds the page's language and its
        // messages, which a soft navigation keeps.
        window.location.assign(next);
        return;
      }
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
    if (await call("saveName", () => authClient.updateUser({ name }))) {
      router.replace(next);
    }
  }

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("name") as HTMLInputElement;
    if (fieldIsValid(input, nameMessages)) {
      void saveName(input.value.trim());
    }
  }

  function changeEmail() {
    setStep("email");
    setError(null);
    setFieldError(null);
  }

  const errorMessage = error && <FormAlert>{error}</FormAlert>;

  if (step === "email") {
    return (
      <form key="email" onSubmit={submitEmail} noValidate>
        <StepHeader title={t("title")}>{t("emailIntro")}</StepHeader>
        <div className="flex flex-col gap-4.5">
          {errorMessage}
          <Field
            label={t("email")}
            hideLabel
            type="email"
            name="email"
            required
            autoComplete="email"
            autoFocus
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              recheck(event, emailMessages);
            }}
            error={fieldError}
          />
          <Button type="submit" size="lg" pending={busy === "sendCode"} pendingLabel={t("sendingCode")}>
            {t("continue")}
          </Button>
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
          {errorMessage}
          <InputOtp
            length={CODE_LENGTH}
            value={code}
            onChange={(value) => {
              setCode(value);
              setFieldError(null);
            }}
            // Never disabled while checking: it would lose focus, and a wrong
            // code should leave the cursor in the first box.
            onComplete={(otp) => void signIn(otp)}
            nonce={nonce}
            aria-label={t("code")}
            error={fieldError}
          />
          <Button
            type="submit"
            size="lg"
            disabled={pending || code.length < CODE_LENGTH}
            pending={busy === "signIn"}
            pendingLabel={t("signingIn")}
          >
            {t("signIn")}
          </Button>
        </div>
        <p className="mt-5 text-center text-label-sm text-balance text-muted">
          {t.rich("notReceived", {
            resend: () => (
              <Button
                variant="link"
                onClick={() => void resendCode()}
                disabled={pending || resendIn > 0}
                pending={busy === "sendCode"}
                pendingLabel={t("sendingCode")}
                className="tabular-nums"
              >
                {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
              </Button>
            ),
          })}
        </p>
      </form>
    );
  }

  return (
    <form key="name" onSubmit={submitName} noValidate>
      <StepHeader title={t("nameTitle")}>{t("nameIntro")}</StepHeader>
      <div className="flex flex-col gap-4.5">
        {errorMessage}
        <Field
          label={t("name")}
          hideLabel
          name="name"
          required
          // Spaces alone would be saved as an empty name.
          pattern=".*\S.*"
          autoComplete="name"
          autoFocus
          placeholder={t("namePlaceholder")}
          onChange={(event) => recheck(event, nameMessages)}
          error={fieldError}
        />
        <Button type="submit" size="lg" pending={busy === "saveName"} pendingLabel={t("saving")}>
          {t("continue")}
        </Button>
      </div>
    </form>
  );
}

function StepHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-7 text-center">
      <h1 className="text-title-h4">{title}</h1>
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
      className="font-medium break-all text-brand-text transition-colors hover:text-ink"
    >
      {email}
      <Tooltip>
        <Icon name="edit" className="size-3" />
        {hint}
      </Tooltip>
    </button>
  );
}
