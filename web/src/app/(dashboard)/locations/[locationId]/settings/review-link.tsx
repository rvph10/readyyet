"use client";

import { ErrorCode } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { use, useState, useTransition, type FormEvent } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { checkReviewLink, updateLocation } from "./actions";
import { InPanel, SectionForm, SectionHeading } from "./section-form";

interface Props {
  locationId: string;
  url: string | null;
  // Whether this Location's plan includes review requests (ADR 0039).
  hasPro: boolean;
  // Called once saved, when the section opened in a panel (ADR 0117).
  onSaved?: () => void;
}

const PROFILE_URL = "https://business.google.com";
const STEPS = ["reviewStep1", "reviewStep2", "reviewStep3"] as const;
const CHECKS: Record<"works" | "dead" | "unknown", { tone: string; icon: IconName }> = {
  works: { tone: "bg-brand text-ink", icon: "check" },
  dead: { tone: "bg-danger-subtle text-danger", icon: "info-triangle" },
  unknown: { tone: "bg-subtle text-ink", icon: "info" },
};

// What was typed, once it can safely be sent to be checked or opened.
function checkableLink(value: string) {
  const link = value.trim();
  return link.startsWith("https://") && URL.canParse(link) ? link : null;
}

// What this setting turns on, drawn rather than explained (ADR 0076).
function CustomerPreview() {
  const t = useTranslations("settings");
  return (
    <aside className="on-pine flex flex-col rounded-3xl bg-pine p-5 text-surface">
      <p className="text-label-sm">{t("reviewPreviewTitle")}</p>
      <div className="mt-4 rounded-2xl bg-surface p-4 text-center text-ink">
        <p className="text-label-md">{t("reviewPreviewAsk")}</p>
        <p aria-hidden="true" className="mt-1 text-2xl leading-8 tracking-widest text-pine">
          ★★★★★
        </p>
      </div>
      <ul className="mt-4 flex flex-col gap-3 text-p-sm">
        <li className="flex gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-ink">
            <Icon name="check" className="size-3" />
          </span>
          {t("reviewPreviewGoogle")}
        </li>
        <li className="flex gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface/15">
            <Icon name="comment" className="size-3" />
          </span>
          {t("reviewPreviewPrivate")}
        </li>
      </ul>
    </aside>
  );
}

// ADR 0100: bold when it's missing on a plan that includes it, as nothing tells
// a shop otherwise that its Customers are never being asked. ADR 0109: the app
// follows the link itself, rather than opening it for the shop to judge.
export function ReviewLink({ locationId, url, hasPro, onSaved }: Props) {
  const t = useTranslations("settings");
  const toast = useToast();
  const saved = url ?? "";
  const [value, setValue] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [check, setCheck] = useState<{ link: string; found: keyof typeof CHECKS | "invalid" } | null>(null);
  const [checking, startChecking] = useTransition();
  const [pending, startTransition] = useTransition();
  const inPanel = use(InPanel);

  if (!hasPro) {
    return (
      <div className="@container">
        {!inPanel && <SectionHeading title={t("nav.reviews")} hint={t("reviewHint")} />}
        <div className="grid max-w-5xl gap-5 @3xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="flex flex-col items-start gap-4 rounded-3xl bg-subtle p-6">
            <p className="text-title-h6 text-balance">{t(url ? "reviewPaused" : "reviewNeedsPro")}</p>
            <Link href={`/locations/${locationId}/billing`} className={buttonClass()}>
              {t("seePlans")}
              <Icon name="arrow-right" className="size-2.5" />
            </Link>
          </div>
          <CustomerPreview />
        </div>
      </div>
    );
  }

  const checkable = checkableLink(value);
  // Only says something about the link that was checked, which may have been
  // edited while Google answered.
  const checked = check?.link === checkable ? check : null;

  function runCheck() {
    const link = checkable!;
    setCheck(null);
    startChecking(async () => {
      const result = await orFailure(checkReviewLink(locationId, link).then((found) => ({ ok: true, found })));
      setCheck({ link, found: "found" in result ? result.found : "unknown" });
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = value.trim() || null;
    setError(null);
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(updateLocation(locationId, { googleReviewUrl: next }));
      if (result.ok) {
        toast({ message: t("saved") });
        onSaved?.();
      } else if (result.fields?.googleReviewUrl) setError(t("reviewInvalid"));
      else setFailure(t(result.code === ErrorCode.PLAN_REQUIRED ? "reviewNeedsPro" : "saveFailed"));
    });
  }

  return (
    <SectionForm
      title={t("nav.reviews")}
      hint={t("reviewHint")}
      onSubmit={submit}
      onDiscard={() => {
        setValue(saved);
        setError(null);
        setFailure(null);
        setCheck(null);
      }}
      dirty={value.trim() !== saved}
      pending={pending}
      failure={failure}
    >
      <div className="grid max-w-5xl gap-5 @3xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <p
            className={`flex items-center gap-3 rounded-2xl p-4 text-label-sm ${url ? "bg-pine-subtle text-pine" : "bg-brand"}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
              <Icon name={url ? "check" : "info"} className="size-3" />
            </span>
            {t(url ? "reviewOn" : "reviewMissing")}
          </p>

          <div>
            <div className="flex items-start gap-2">
              <Field
                className="min-w-0 flex-1"
                label={t("reviewLabel")}
                type="url"
                autoComplete="off"
                placeholder="https://g.page/r/.../review"
                maxLength={2048}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(null);
                }}
                error={error ?? (checked?.found === "invalid" ? t("reviewInvalid") : null)}
              />
              <Button
                variant="secondary"
                className="mt-7"
                disabled={!checkable}
                pending={checking}
                pendingLabel={t("reviewChecking")}
                onClick={runCheck}
              >
                {t("reviewCheck")}
              </Button>
            </div>
            <div aria-live="polite">
              {checked && checked.found !== "invalid" && (
                <p
                  className={`mt-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-p-sm ${CHECKS[checked.found].tone}`}
                >
                  <Icon name={CHECKS[checked.found].icon} className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1">{t(`reviewCheckResult.${checked.found}`)}</span>
                  {checked.found === "works" && (
                    <a
                      href={checked.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 font-semibold underline underline-offset-4"
                    >
                      {t("reviewOpen")}
                    </a>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Only for finding the link, so it goes once there's one. */}
          {!value.trim() && (
            <section className="rounded-3xl border border-border-strong p-5">
              <h3 className="text-label-md">{t("reviewFindTitle")}</h3>
              <ol className="mt-3 flex flex-col gap-2.5">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex items-center gap-3 text-p-sm">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-subtle text-label-xs font-semibold">
                      {index + 1}
                    </span>
                    {t(step)}
                  </li>
                ))}
              </ol>
              <a
                href={PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonClass({ variant: "secondary", size: "sm" })} mt-4`}
              >
                {t("reviewOpenProfile")}
                <Icon name="arrow-right" className="size-2.5" />
              </a>
            </section>
          )}
        </div>
        <CustomerPreview />
      </div>
    </SectionForm>
  );
}
