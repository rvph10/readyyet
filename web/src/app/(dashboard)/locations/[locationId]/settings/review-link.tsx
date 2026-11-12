"use client";

import { ErrorCode } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { use, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { checkReviewLink, updateLocation } from "./actions";
import { GoogleFinder } from "./google-finder";
import { InPanel, SectionForm, SectionHeading } from "./section-form";

interface Props {
  location: Pick<
    components["schemas"]["LocationDto"],
    "id" | "name" | "googleReviewUrl" | "feedbackEmails" | "address" | "openingHours"
  >;
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

// What someone would type into Google Maps: the name, and the town unless
// the name already says it.
function googleQuery(name: string, town: string | undefined) {
  return town && !name.toLowerCase().includes(town.toLowerCase()) ? `${name} ${town}` : name;
}

// ADR 0126: pasting a link by hand is for a shop Google doesn't find, so it
// waits folded under the search.
function ManualLink({ children }: { children: ReactNode }) {
  const t = useTranslations("settings.google");
  return (
    <details className="group rounded-3xl bg-subtle p-5 open:flex open:flex-col open:gap-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-label-sm">
        {t("pasteInstead")}
        <Icon name="arrow-down-1" className="size-3 transition-transform group-open:rotate-180" />
      </summary>
      {children}
    </details>
  );
}

// ADR 0100: bold when it's missing on a plan that includes it, as the tracking
// page then has no Google link to offer. Set up whatever the email switch says,
// the tracking page uses it too (ADR 0131). ADR 0109: the app
// follows the link itself, rather than opening it for the shop to judge.
export function ReviewLink({ location, hasPro, onSaved }: Props) {
  const t = useTranslations("settings");
  const { id: locationId, googleReviewUrl: url, feedbackEmails } = location;
  const toast = useToast();
  const saved = url ?? "";
  const [value, setValue] = useState(saved);
  // A saved link shows as linked, with the search and the field only to change it.
  const [changing, setChanging] = useState(false);
  // Saved from the search, the field shows the new link rather than unsaved changes.
  const [shown, setShown] = useState(saved);
  if (shown !== saved) {
    setShown(saved);
    setValue(saved);
    setChanging(false);
  }
  // ADR 0131: the shop's choice, saved as soon as it's flipped, as a switch reads as done.
  const [emails, setEmails] = useState(feedbackEmails);
  const [shownEmails, setShownEmails] = useState(feedbackEmails);
  if (shownEmails !== feedbackEmails) {
    setShownEmails(feedbackEmails);
    setEmails(feedbackEmails);
  }
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [check, setCheck] = useState<{ link: string; found: keyof typeof CHECKS | "invalid" } | null>(null);
  const [checking, startChecking] = useTransition();
  const [pending, startTransition] = useTransition();
  const [switching, startSwitching] = useTransition();
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

  function toggleEmails(next: boolean) {
    setEmails(next);
    startSwitching(async () => {
      const result = await orFailure(updateLocation(locationId, { feedbackEmails: next }));
      if (result.ok) toast({ message: t(next ? "feedbackEmailsOn" : "feedbackEmailsOff") });
      else {
        setEmails(!next);
        setFailure(t(result.code === ErrorCode.PLAN_REQUIRED ? "reviewNeedsPro" : "saveFailed"));
      }
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
          <Switch
            className="rounded-2xl bg-subtle p-4"
            label={t("feedbackEmailsSwitch")}
            description={t("feedbackEmailsHint")}
            checked={emails}
            disabled={switching}
            onChange={(event) => toggleEmails(event.target.checked)}
          />
          {/* ADR 0126: a saved link reads as linked, never as the long Google address. */}
          <div
            className={`flex flex-wrap items-center gap-3 rounded-2xl p-4 text-label-sm ${url ? "bg-pine-subtle text-pine" : "bg-brand"}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
              <Icon name={url ? "check" : "info"} className="size-3" />
            </span>
            <span className="min-w-0 flex-1">{t(url ? "reviewOn" : "reviewMissing")}</span>
            {url && changing && (
              <Button variant="secondary" size="sm" onClick={() => setChanging(false)}>
                {t("google.keep")}
              </Button>
            )}
            {url && !changing && (
              <span className="flex gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass({ variant: "secondary", size: "sm" })}
                >
                  {t("google.open")}
                </a>
                <Button variant="secondary" size="sm" onClick={() => setChanging(true)}>
                  {t("google.change")}
                </Button>
              </span>
            )}
          </div>

          {(!url || changing) && (
            <GoogleFinder
              locationId={locationId}
              query={googleQuery(location.name, location.address?.addressLocality)}
              needsAddress={location.address === null}
              needsHours={location.openingHours.length === 0}
              onSaved={onSaved}
            />
          )}

          {(!url || changing) && (
            <ManualLink>
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
            </ManualLink>
          )}
        </div>
        <CustomerPreview />
      </div>
    </SectionForm>
  );
}
