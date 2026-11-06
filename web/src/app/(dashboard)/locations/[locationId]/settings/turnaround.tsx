"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { turnaroundReadyDate } from "@readyyet/shared";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { updateLocation } from "./actions";
import { turnaroundSchema } from "./schema";
import { SectionForm } from "./section-form";

type OpeningHours = components["schemas"]["OpeningHoursSpecificationDto"][];

export function Turnaround({
  locationId,
  days,
  openingHours,
  timeZone,
}: {
  locationId: string;
  days: number | null;
  openingHours: OpeningHours;
  timeZone: string;
}) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const toast = useToast();
  const saved = days?.toString() ?? "";
  const [value, setValue] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const previewDays = Number(value);
  const previewDate =
    value && Number.isInteger(previewDays) && previewDays >= 1 && previewDays <= 60
      ? turnaroundReadyDate({ droppedOffAt: new Date(), turnaroundDays: previewDays, timeZone, openingHours })
      : null;
  const formattedPreviewDate = previewDate
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
        timeZone: "UTC",
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(`${previewDate}T12:00:00Z`))
    : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = turnaroundSchema(t).safeParse(value);
    setFailure(null);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await orFailure(updateLocation(locationId, { turnaroundDays: parsed.data }));
      if (result.ok) toast({ message: t("saved") });
      else setFailure(t("saveFailed"));
    });
  }

  return (
    <SectionForm
      title={t("nav.tickets")}
      hint={t("ticketsHint")}
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
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)]">
        <section className="rounded-3xl border border-border p-5 lg:p-6">
          <h3 className="text-label-md">{t("turnaroundTitle")}</h3>
          <p className="mt-1 max-w-lg text-p-sm text-pretty text-muted">{t("turnaroundRowHint")}</p>
          <div className="mt-6 flex items-end gap-3">
            <Field
              className="max-w-36"
              label={t("turnaroundLabel")}
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              step={1}
              placeholder={t("turnaroundPlaceholder")}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              error={error}
            />
            <span className="mb-3.5 text-label-sm text-muted">{t("turnaroundUnit")}</span>
          </div>
          <p className="mt-2 text-p-sm text-muted">{t("turnaroundRange")}</p>
        </section>

        <aside className="flex flex-col justify-center rounded-3xl bg-pine-subtle p-5 lg:p-6">
          <h3 className="text-label-md">
            {formattedPreviewDate ? t("turnaroundPreviewTitle") : t("turnaroundUnsetTitle")}
          </h3>
          {formattedPreviewDate ? (
            <>
              <p className="mt-2 text-p-sm text-muted">{t("turnaroundPreviewBody")}</p>
              <p className="mt-3 text-title-h6 text-balance">{formattedPreviewDate}</p>
            </>
          ) : (
            <p className="mt-2 text-p-sm text-muted">{t("turnaroundUnsetHint")}</p>
          )}
        </aside>
      </div>
    </SectionForm>
  );
}
