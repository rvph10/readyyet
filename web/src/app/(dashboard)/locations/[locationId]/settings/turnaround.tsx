"use client";

import { calendarDateIn, turnaroundReadyDate } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { updateLocation } from "./actions";
import { SectionForm } from "./section-form";
import { turnaroundWeeks } from "./settings-views";

type OpeningHours = components["schemas"]["OpeningHoursSpecificationDto"][];

const MIN_DAYS = 1;
const MAX_DAYS = 60;
const USUAL_DAYS = 5;
const PRESETS = [1, 2, 3, 5, 7, 10, 14, 30];

const cells = {
  outside: "text-border-strong",
  today: "bg-pine font-bold text-surface",
  counted: "bg-pine-subtle font-semibold text-pine",
  closed: "bg-subtle text-muted line-through",
  ready: "bg-brand font-bold text-ink",
};

function Key({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-p-xs text-muted">
      <span className={`size-3 rounded ${tone}`} />
      {label}
    </span>
  );
}

// ADR 0111: one number, picked by feel, and the calendar it leads to, as what a
// shop wants to know is which day that number promises its Customers.
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
  const [on, setOn] = useState(days !== null);
  const [value, setValue] = useState(days ?? USUAL_DAYS);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const chosen = on ? value : null;
  const now = new Date();
  const ready = turnaroundReadyDate({ droppedOffAt: now, turnaroundDays: value, timeZone, openingHours });
  const weeks = turnaroundWeeks(calendarDateIn(now, timeZone), ready, openingHours);
  const language = locale === "en" ? "en-GB" : locale;
  const readyShown = new Intl.DateTimeFormat(language, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${ready}T12:00:00Z`));
  const dayLetters = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(language, { timeZone: "UTC", weekday: "narrow" }).format(Date.UTC(2024, 0, 1 + index)),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(updateLocation(locationId, { turnaroundDays: chosen }));
      if (result.ok) toast({ message: t("saved") });
      else setFailure(t("saveFailed"));
    });
  }

  const step = (by: number) => setValue((current) => Math.min(MAX_DAYS, Math.max(MIN_DAYS, current + by)));

  return (
    <SectionForm
      title={t("nav.tickets")}
      hint={t("ticketsHint")}
      onSubmit={submit}
      onDiscard={() => {
        setOn(days !== null);
        setValue(days ?? USUAL_DAYS);
        setFailure(null);
      }}
      dirty={chosen !== days}
      pending={pending}
      failure={failure}
    >
      <div className="flex max-w-4xl flex-col gap-5">
        <Switch
          className="rounded-2xl bg-subtle p-4"
          label={t("turnaroundSwitch")}
          description={t("turnaroundRowHint")}
          checked={on}
          onChange={(event) => setOn(event.target.checked)}
        />
        {on && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <section className="flex flex-col rounded-3xl border border-border-strong p-5 lg:p-6">
              <h3 className="text-label-sm">{t("turnaroundTitle")}</h3>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={t("turnaroundLess")}
                  disabled={value === MIN_DAYS}
                  onClick={() => step(-1)}
                >
                  <Icon name="minus" className="size-3" />
                </Button>
                <p aria-live="polite" className="min-w-0 flex-1 text-center">
                  <span className="text-[3.5rem] leading-[4rem] font-bold tracking-tight">{value}</span>
                  <span className="ml-2 text-label-md text-muted">{t("turnaroundUnit", { count: value })}</span>
                </p>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={t("turnaroundMore")}
                  disabled={value === MAX_DAYS}
                  onClick={() => step(1)}
                >
                  <Icon name="add" className="size-3" />
                </Button>
              </div>
              <input
                ref={(range) => {
                  range?.style.setProperty("--fill", `${((value - MIN_DAYS) / (MAX_DAYS - MIN_DAYS)) * 100}%`);
                }}
                type="range"
                aria-label={t("turnaroundTitle")}
                className="range-field mt-3"
                min={MIN_DAYS}
                max={MAX_DAYS}
                value={value}
                onChange={(event) => setValue(Number(event.target.value))}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={preset === value}
                    onClick={() => setValue(preset)}
                    className={`h-10 min-w-11 cursor-pointer rounded-full px-3 text-label-sm transition-colors ${
                      preset === value ? "bg-pine text-surface" : "bg-subtle hover:bg-border"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <p className="mt-auto pt-5 text-p-sm text-muted">{t("turnaroundSkips")}</p>
            </section>

            <aside className="rounded-3xl bg-subtle p-5">
              <p className="text-p-sm text-muted">{t("turnaroundPreviewBody")}</p>
              <p className="mt-0.5 text-title-h6 text-balance">{readyShown}</p>
              <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                {dayLetters.map((letter, index) => (
                  <span key={index} className="text-label-xs text-muted">
                    {letter}
                  </span>
                ))}
                {weeks.flat().map(({ date, kind }) => (
                  <span
                    key={date}
                    className={`flex aspect-square items-center justify-center rounded-lg text-label-xs ${cells[kind]}`}
                  >
                    {Number(date.slice(8))}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
                <Key tone="bg-pine" label={t("turnaroundKeyToday")} />
                <Key tone="bg-pine-subtle" label={t("turnaroundKeyCounted")} />
                <Key tone="bg-border" label={t("closed")} />
                <Key tone="bg-brand" label={t("turnaroundKeyReady")} />
              </div>
            </aside>
          </div>
        )}
      </div>
    </SectionForm>
  );
}
