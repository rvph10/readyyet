"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { updateLocation } from "./actions";
import { SectionForm } from "./section-form";
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
}

export function OpeningHours({ locationId, hours }: Props) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const toast = useToast();
  const saved = weekFrom(hours);
  const [week, setWeek] = useState(saved);
  const [invalid, setInvalid] = useState<Day[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(week) !== JSON.stringify(saved);

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
      const result = await orFailure(updateLocation(locationId, { openingHours: hoursFrom(week) }));
      if (result.ok) toast({ message: t("saved") });
      else setFailure(t("saveFailed"));
    });
  }

  return (
    <SectionForm
      title={t("nav.hours")}
      hint={t("hoursHint")}
      onSubmit={submit}
      onDiscard={() => {
        setWeek(saved);
        setInvalid([]);
        setFailure(null);
      }}
      dirty={dirty}
      pending={pending}
      failure={failure}
    >
      <ul>
        {DAYS.map((day) => {
          const ranges = week[day];
          const name = dayName(day, locale);
          return (
            <li
              key={day}
              className="grid gap-x-6 gap-y-2 border-t border-border py-4 first:border-t-0 first:pt-0 md:grid-cols-[9rem_minmax(0,1fr)]"
            >
              <Checkbox
                className="md:pt-3"
                label={name}
                checked={ranges.length > 0}
                onChange={(event) => setDay(day, event.target.checked ? [DEFAULT_RANGE] : [])}
              />
              <div className="min-w-0">
                {ranges.length === 0 && <p className="text-p-sm text-muted md:pt-3">{t("closed")}</p>}
                {ranges.map((range, index) => (
                  <div
                    key={index}
                    className="mb-2 flex items-center gap-3 last:mb-0 max-sm:gap-2 max-sm:[&_input::-webkit-calendar-picker-indicator]:hidden"
                  >
                    <Field
                      className="min-w-0 flex-1 xl:max-w-44 xl:flex-none"
                      label={t("opensOn", { day: name })}
                      hideLabel
                      type="time"
                      value={range.opens}
                      onChange={(event) => setTime(day, index, "opens", event.target.value)}
                    />
                    <span className="text-p-sm text-muted">{t("to")}</span>
                    <Field
                      className="min-w-0 flex-1 xl:max-w-44 xl:flex-none"
                      label={t("closesOn", { day: name })}
                      hideLabel
                      type="time"
                      value={range.closes}
                      onChange={(event) => setTime(day, index, "closes", event.target.value)}
                    />
                  </div>
                ))}
                {invalid.includes(day) && <p className="mt-2 text-p-sm text-danger">{t("hoursInvalid")}</p>}
                {ranges.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
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
              </div>
            </li>
          );
        })}
      </ul>
    </SectionForm>
  );
}
