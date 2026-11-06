"use client";

import { ErrorCode } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { updateLocation } from "./actions";
import { SectionForm, SectionHeading } from "./section-form";

interface Props {
  locationId: string;
  url: string | null;
  // Whether this Location's plan includes review requests (ADR 0039).
  hasPro: boolean;
}

const PROFILE_URL = "https://business.google.com";
const googleGuideUrl = (locale: string) =>
  `https://support.google.com/business/answer/16816815?hl=${locale === "fr" ? "fr" : "en"}`;

// What was typed, once it can safely be an address to open.
function testableLink(value: string) {
  const link = value.trim();
  return link.startsWith("https://") && URL.canParse(link) ? link : null;
}

// ADR 0100: bold when it's missing on a plan that includes it, as nothing tells
// a shop otherwise that its Customers are never being asked.
export function ReviewLink({ locationId, url, hasPro }: Props) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const toast = useToast();
  const saved = url ?? "";
  const [value, setValue] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasPro) {
    return (
      <>
        <SectionHeading title={t("nav.reviews")} hint={t("reviewHint")} />
        <div className="flex flex-col items-start gap-4 rounded-card bg-subtle p-5">
          <p className="text-p-md">{t(url ? "reviewPaused" : "reviewNeedsPro")}</p>
          <Link href={`/locations/${locationId}/billing`} className={buttonClass()}>
            {t("seePlans")}
            <Icon name="arrow-right" className="size-2.5" />
          </Link>
        </div>
      </>
    );
  }

  const testable = testableLink(value);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = value.trim() || null;
    setError(null);
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(updateLocation(locationId, { googleReviewUrl: next }));
      if (result.ok) toast({ message: t("saved") });
      else if (result.fields?.googleReviewUrl) setError(t("reviewInvalid"));
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
      }}
      dirty={value.trim() !== saved}
      pending={pending}
      failure={failure}
    >
      {url ? (
        <p className="mb-6 flex items-center gap-3 rounded-card bg-subtle p-4 text-label-sm">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand">
            <Icon name="check" className="size-3" />
          </span>
          {t("reviewOn")}
        </p>
      ) : (
        <p className="mb-6 rounded-card bg-brand p-4 text-label-sm">{t("reviewMissing")}</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-card border border-border p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-label-sm">
              1
            </span>
            <h3 className="text-label-md">{t("reviewGuideTitle")}</h3>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-p-sm text-muted">
            <li>{t("reviewStep1")}</li>
            <li>{t("reviewStep2")}</li>
            <li>{t("reviewStep3")}</li>
          </ol>
          <p className="mt-3 text-p-sm text-muted">{t("reviewComputer")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href={PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              {t("reviewOpenProfile")}
              <Icon name="arrow-right" className="size-2.5" />
            </a>
            <a
              href={googleGuideUrl(locale)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: "link" })}
            >
              {t("reviewGoogleGuide")}
            </a>
          </div>
        </section>

        <section className="rounded-card bg-subtle p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-label-sm">
              2
            </span>
            <h3 className="text-label-md">{t("reviewPasteTitle")}</h3>
          </div>
          <p className="mb-4 text-p-sm text-muted">{t("reviewPasteHint")}</p>
          <Field
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
            error={error}
          />
          {testable && (
            <div className="mt-4">
              <a
                href={testable}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: "secondary", size: "sm" })}
              >
                {t("reviewTest")}
                <Icon name="arrow-right" className="size-2.5" />
              </a>
              <p className="mt-2 text-p-sm text-muted">{t("reviewTestHint")}</p>
            </div>
          )}
        </section>
      </div>
    </SectionForm>
  );
}
