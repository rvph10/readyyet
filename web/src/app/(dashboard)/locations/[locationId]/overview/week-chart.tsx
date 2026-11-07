"use client";

import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import type { components } from "@/lib/api/schema";

type Day = components["schemas"]["OverviewDayDto"];

// The one dark tile on the page: lime bars only read on pine (9.7:1, against
// 1.15:1 on white). Today is full lime, the days before a dimmer step. Heights
// go through the CSSOM, which the CSP allows (ADR 0048).
export function WeekChart({ days, previousWeek, className }: { days: Day[]; previousWeek: number; className: string }) {
  const t = useTranslations("today");
  const locale = useLocale();
  const total = days.reduce((sum, { count }) => sum + count, 0);
  const max = Math.max(1, ...days.map(({ count }) => count));
  const change = total - previousWeek;
  const weekday = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { timeZone: "UTC", weekday: "short" });
  const longDay = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });

  return (
    <section className={`on-pine flex flex-col rounded-sheet bg-pine p-5 text-surface ${className}`}>
      <h2 className="text-label-sm">{t("handedOver")}</h2>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[2.5rem] leading-[3rem] font-bold tracking-tight">{total}</p>
        <span
          className={`inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-label-sm font-bold ${
            change > 0 ? "bg-brand text-ink" : "bg-surface/15 text-surface"
          }`}
        >
          {change !== 0 && <Icon name={change > 0 ? "arrow-up-1" : "arrow-down-1"} className="size-2.5" />}
          {change > 0 ? `+${change}` : change}
        </span>
        <span className="text-p-sm">{t("vsLastWeek")}</span>
      </div>
      <ul className="flex min-h-28 flex-1 gap-2 pt-8 lg:gap-3 xl:min-h-24" aria-label={t("handedOver")}>
        {days.map(({ date, count }, index) => {
          const day = new Date(`${date}T00:00:00Z`);
          const label = t("ticketCount", { count });
          return (
            <li key={date} className="group/bar grid min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-1.5">
              <div className="relative">
                <span
                  role="img"
                  tabIndex={0}
                  aria-label={`${longDay.format(day)}: ${label}`}
                  className="absolute inset-0 rounded-t-[4px] focus-visible:outline-offset-1"
                />
                <div
                  ref={(bar) => {
                    if (bar) bar.style.height = `${count === 0 ? 3 : (count / max) * 100}%`;
                  }}
                  className={`pointer-events-none absolute inset-x-0 bottom-0 rounded-t-[4px] rounded-b-[2px] transition-colors ${
                    count === 0
                      ? "bg-surface/20"
                      : index === days.length - 1
                        ? "bg-brand"
                        : "bg-brand/55 group-hover/bar:bg-brand/80"
                  }`}
                />
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-surface px-2 py-1 text-label-xs font-semibold whitespace-nowrap text-ink group-hover/bar:block group-has-focus-visible/bar:block">
                  {label}
                </span>
              </div>
              <span className="truncate text-center text-p-xs">{weekday.format(day)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
