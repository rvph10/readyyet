"use client";

import type { CalendarDate } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { addDays, addMonths, monthWeeks, weekdayIndex } from "@/lib/calendar-grid";
import { controlClass, describedBy, FieldFrame } from "./field";
import { Icon } from "./icon";

interface Props {
  label: string;
  hint?: string;
  error?: string | null;
  // A date, or "" for none.
  value: string;
  onChange: (value: string) => void;
  // The Location's today, marked on the calendar.
  today: CalendarDate;
  // The earliest day that can be chosen.
  min?: CalendarDate;
}

function format(locale: string, options: Intl.DateTimeFormatOptions, date: CalendarDate) {
  const text = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { timeZone: "UTC", ...options }).format(
    new Date(`${date}T00:00:00Z`),
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ADR 0089: the browser's date picker can't be styled, so this draws its own in
// the browser's popover, which stays above a dialog. It's WAI-ARIA's date
// picker dialog: arrows move by day and week, Home and End to the week's ends,
// Page keys by month, and Escape closes it, focus going back to the field.
export function DateField({ label, hint, error, value, onChange, today, min }: Props) {
  const t = useTranslations("common");
  const locale = useLocale();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLTableElement>(null);
  const [focused, setFocused] = useState<CalendarDate>(value || today);
  // Set by the keyboard, so a click on the month arrows keeps focus where it is.
  const moveFocus = useRef(false);

  // Set through the CSSOM, which the CSP allows (ADR 0048), see Menu.
  useEffect(() => {
    const name = `--date-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
    button.current!.style.setProperty("anchor-name", name);
    panel.current!.style.setProperty("position-anchor", name);
  }, [id]);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>("[tabindex='0']")?.focus();
  }, [focused]);

  const blocked = (date: CalendarDate) => Boolean(min && date < min);

  function choose(date: string) {
    onChange(date);
    panel.current!.hidePopover();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const moves: Record<string, () => CalendarDate> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -weekdayIndex(focused)),
      End: () => addDays(focused, 6 - weekdayIndex(focused)),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    moveFocus.current = true;
    setFocused(moves[event.key]());
  }

  const weeks = monthWeeks(focused);
  const month = focused.slice(0, 7);
  const monthButton =
    "flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-ink";

  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <button
        ref={button}
        type="button"
        popoverTarget={`${id}-calendar`}
        aria-haspopup="dialog"
        {...describedBy(id, hint, error)}
        className={`flex h-12 cursor-pointer items-center gap-3 pl-4 text-left ${hint ? "pr-12" : "pr-4"} ${controlClass(error)}`}
      >
        <Icon name="date" className="size-4 shrink-0 text-muted" />
        <span className={`min-w-0 truncate ${value ? "" : "text-muted"}`}>
          {value
            ? format(locale, { weekday: "short", day: "numeric", month: "long", year: "numeric" }, value)
            : t("chooseDate")}
        </span>
      </button>
      <div
        ref={panel}
        id={`${id}-calendar`}
        popover="auto"
        role="dialog"
        aria-label={label}
        onToggle={(event) => {
          if (event.newState !== "open") return;
          moveFocus.current = true;
          setFocused((current) => {
            const start = value || (min && today < min ? min : today);
            // The effect above only runs on a change, this one has none.
            if (current === start) grid.current?.querySelector<HTMLButtonElement>("[tabindex='0']")?.focus();
            return start;
          });
        }}
        className="date-popover rounded-card border border-border-strong bg-surface p-3 text-ink"
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label={t("previousMonth")}
            onClick={() => setFocused(addMonths(focused, -1))}
            className={monthButton}
          >
            <Icon name="arrow-left-1" className="size-3" />
          </button>
          <p aria-live="polite" className="text-label-md">
            {format(locale, { month: "long", year: "numeric" }, focused)}
          </p>
          <button
            type="button"
            aria-label={t("nextMonth")}
            onClick={() => setFocused(addMonths(focused, 1))}
            className={monthButton}
          >
            <Icon name="arrow-right" className="size-3" />
          </button>
        </div>
        <table ref={grid} role="grid" aria-label={label} onKeyDown={onKeyDown} className="mt-2 w-full border-collapse">
          <thead>
            <tr>
              {weeks[0].map((day) => (
                <th
                  key={day}
                  scope="col"
                  abbr={format(locale, { weekday: "long" }, day)}
                  className="h-9 text-label-xs text-muted"
                >
                  {format(locale, { weekday: "short" }, day).slice(0, 2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]}>
                {week.map((day) => {
                  const selected = day === value;
                  const off = blocked(day);
                  return (
                    <td key={day} className="p-px text-center">
                      <button
                        type="button"
                        tabIndex={day === focused ? 0 : -1}
                        aria-selected={selected}
                        aria-disabled={off || undefined}
                        aria-current={day === today ? "date" : undefined}
                        aria-label={format(locale, { weekday: "long", day: "numeric", month: "long" }, day)}
                        onClick={() => {
                          if (!off) choose(day);
                        }}
                        className={`relative flex aspect-square w-full items-center justify-center rounded-xl text-label-sm transition-colors ${
                          selected
                            ? "cursor-pointer bg-pine text-surface"
                            : off
                              ? "cursor-not-allowed font-normal text-muted/45"
                              : `cursor-pointer hover:bg-subtle ${day.startsWith(month) ? "" : "font-normal text-muted"}`
                        }`}
                      >
                        {Number(day.slice(8))}
                        {day === today && (
                          <span
                            aria-hidden="true"
                            className={`absolute bottom-1 size-1 rounded-full ${selected ? "bg-brand" : "bg-pine"}`}
                          />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
          <button
            type="button"
            disabled={!value}
            onClick={() => choose("")}
            className="h-10 cursor-pointer rounded-full px-3 text-label-xs font-semibold text-muted transition-colors not-disabled:hover:bg-subtle not-disabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("clearDate")}
          </button>
          <button
            type="button"
            disabled={blocked(today)}
            onClick={() => choose(today)}
            className="h-10 cursor-pointer rounded-full px-3 text-label-xs font-semibold text-pine transition-colors not-disabled:hover:bg-pine-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("today")}
          </button>
        </div>
      </div>
    </FieldFrame>
  );
}
