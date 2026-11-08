"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { Field, SelectField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { updateLocation } from "./actions";
import { SectionForm, useInBrowser } from "./section-form";
import {
  DAYS,
  DEFAULT_RANGE,
  dayIsValid,
  dayName,
  hoursFrom,
  weekFrom,
  WEEKDAYS,
  withBreak,
  type Day,
  type OpeningHours as Hours,
  type TimeRange,
  type Week,
} from "./settings-views";

interface Props {
  locationId: string;
  hours: Hours[];
  timeZone: string;
  // Called once saved, when the section opened in a panel (ADR 0117).
  onSaved?: () => void;
}

// ADR 0111: a day is on or off. An open one is a white row with its times, a
// closed one falls back into the sheet, so the week reads before any time does.
export function OpeningHours({ locationId, hours, timeZone, onSaved }: Props) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const toast = useToast();
  const inBrowser = useInBrowser();
  const saved = weekFrom(hours);
  const [week, setWeek] = useState(saved);
  const [zone, setZone] = useState(timeZone);
  const [invalid, setInvalid] = useState<Day[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const weekChanged = JSON.stringify(week) !== JSON.stringify(saved);
  const dirty = weekChanged || zone !== timeZone;

  function setDay(day: Day, ranges: TimeRange[]) {
    setWeek((current) => ({ ...current, [day]: ranges }));
    setInvalid((days) => days.filter((other) => other !== day));
  }

  function setTime(day: Day, index: number, key: keyof TimeRange, value: string) {
    setDay(
      day,
      week[day].map((range, i) => (i === index ? { ...range, [key]: value } : range)),
    );
  }

  function copyMonday() {
    setWeek((current) => ({
      ...current,
      ...(Object.fromEntries(WEEKDAYS.map((day) => [day, current.Monday])) as Partial<Week>),
    }));
    setInvalid((days) => days.filter((day) => !WEEKDAYS.includes(day)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wrong = DAYS.filter((day) => !dayIsValid(week[day]));
    setInvalid(wrong);
    setFailure(null);
    if (wrong.length > 0) return;
    startTransition(async () => {
      const result = await orFailure(
        updateLocation(locationId, {
          ...(weekChanged && { openingHours: hoursFrom(week) }),
          ...(zone !== timeZone && { timeZone: zone }),
        }),
      );
      if (result.ok) {
        toast({ message: t("saved") });
        onSaved?.();
      } else setFailure(t("saveFailed"));
    });
  }

  return (
    <SectionForm
      title={t("nav.hours")}
      hint={t("hoursHint")}
      onSubmit={submit}
      onDiscard={() => {
        setWeek(saved);
        setZone(timeZone);
        setInvalid([]);
        setFailure(null);
      }}
      dirty={dirty}
      pending={pending}
      failure={failure}
    >
      <div className="flex max-w-3xl flex-col gap-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-subtle p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
            <Icon name="globe" className="size-4" />
          </span>
          <div className="min-w-48 flex-1">
            <p className="text-label-sm">{t("timeZone")}</p>
            <p className="text-p-xs text-muted">{t("timeZoneHint")}</p>
          </div>
          <SelectField
            className="w-full sm:w-64"
            label={t("timeZone")}
            hideLabel
            value={zone}
            onChange={(event) => setZone(event.target.value)}
          >
            {(inBrowser ? Intl.supportedValuesOf("timeZone") : [zone]).map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
        </div>
        <ul className="flex flex-col gap-2">
          {DAYS.map((day) => {
            const ranges = week[day];
            const open = ranges.length > 0;
            const name = dayName(day, locale);
            return (
              <li
                key={day}
                className={`grid min-h-16 items-center gap-x-6 gap-y-2 rounded-2xl border px-4 py-2.5 transition-colors md:grid-cols-[9.5rem_minmax(0,1fr)] ${
                  open ? "border-border-strong bg-surface" : "border-transparent bg-subtle"
                }`}
              >
                <Switch
                  className={`items-center ${open ? "" : "[&_span]:text-muted"}`}
                  label={name}
                  checked={open}
                  onChange={(event) => setDay(day, event.target.checked ? [DEFAULT_RANGE] : [])}
                />
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  {!open && <p className="text-label-sm text-muted">{t("closed")}</p>}
                  {open && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {ranges.map((range, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 max-sm:[&_input::-webkit-calendar-picker-indicator]:hidden"
                        >
                          <Field
                            className="w-28"
                            label={t("opensOn", { day: name })}
                            hideLabel
                            type="time"
                            value={range.opens}
                            onChange={(event) => setTime(day, index, "opens", event.target.value)}
                          />
                          <span className="text-p-sm text-muted">{t("to")}</span>
                          <Field
                            className="w-28"
                            label={t("closesOn", { day: name })}
                            hideLabel
                            type="time"
                            value={range.closes}
                            onChange={(event) => setTime(day, index, "closes", event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {open && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {ranges.length === 1 ? (
                        <Button variant="link" onClick={() => setDay(day, withBreak(ranges))}>
                          {t("addBreak")}
                        </Button>
                      ) : (
                        <Button
                          variant="link"
                          onClick={() => setDay(day, [{ opens: ranges[0].opens, closes: ranges[1].closes }])}
                        >
                          {t("removeBreak")}
                        </Button>
                      )}
                      {day === "Monday" && (
                        <Button variant="link" onClick={copyMonday}>
                          {t("copyMonday")}
                        </Button>
                      )}
                    </div>
                  )}
                  {invalid.includes(day) && <p className="w-full text-p-sm text-danger">{t("hoursInvalid")}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </SectionForm>
  );
}
