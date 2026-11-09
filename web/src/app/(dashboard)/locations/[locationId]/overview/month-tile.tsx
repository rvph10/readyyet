"use client";

import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { components } from "@/lib/api/schema";
import { intlLocale } from "../tickets/ticket-views";

type Received = components["schemas"]["InsightsReceivedDto"];
type Customers = components["schemas"]["InsightsCustomersDto"];

// Heights and widths go through the CSSOM, which the CSP allows (ADR 0048).
function sized(property: "height" | "width", percent: number) {
  return (element: HTMLElement | null) => {
    if (element) element.style[property] = `${percent}%`;
  };
}

// ADR 0116: whether the shop is growing, month by month, and who's coming in.
// This month is compared with last month up to the same day, not all of it.
export function MonthTile({
  received,
  customers,
  className,
}: {
  // Both null while the month loads: the tile stands, its numbers wait.
  received: Received | null;
  customers: Customers | null;
  className: string;
}) {
  const t = useTranslations("today.month");
  const locale = useLocale();
  if (!received || !customers) return <MonthLoading title={t("title")} className={className} />;
  const { months, lastMonthSoFar } = received;
  const current = months.at(-1)!.received;
  const change = current - lastMonthSoFar;
  const max = Math.max(1, ...months.map((month) => month.received));
  const name = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", month: "short" });
  const longName = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", month: "long" });
  const monthDate = (month: string) => new Date(`${month}-01T00:00:00Z`);
  const people = customers.new + customers.returning;
  const lastMonth = longName.format(monthDate(months.at(-2)!.month));

  return (
    <section className={`flex flex-col gap-6 rounded-sheet border border-border bg-surface p-5 lg:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-label-md">{t("title")}</h2>
          <p className="text-[3rem] leading-[3.5rem] font-bold tracking-tight">{current}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-label-sm font-bold ${
              change > 0 ? "bg-brand text-ink" : change < 0 ? "bg-danger-subtle text-danger" : "bg-subtle text-ink"
            }`}
          >
            {change !== 0 && <Icon name={change > 0 ? "arrow-up-1" : "arrow-down-1"} className="size-2.5" />}
            {change > 0 ? `+${change}` : change}
          </span>
          <span className="text-p-xs text-muted">{t("vsLastMonth", { month: lastMonth })}</span>
        </div>
      </div>

      <ul className="flex h-36 gap-2 lg:gap-3" aria-label={t("chartLabel")}>
        {months.map(({ month, received: count }, index) => {
          const now = index === months.length - 1;
          return (
            <li key={month} className="group/bar grid min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2">
              <div className="relative">
                <span
                  role="img"
                  tabIndex={0}
                  aria-label={`${longName.format(monthDate(month))}: ${t("tickets", { count })}`}
                  className="absolute inset-0 rounded-t-lg focus-visible:outline-offset-1"
                />
                <div
                  ref={sized("height", count === 0 ? 2 : (count / max) * 100)}
                  className={`grows pointer-events-none absolute inset-x-0 bottom-0 rounded-t-lg rounded-b-sm ${
                    now ? "bg-pine" : "bg-pine-subtle group-hover/bar:bg-pine/30"
                  }`}
                />
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-label-xs font-semibold whitespace-nowrap text-surface group-hover/bar:block group-has-focus-visible/bar:block">
                  {t("tickets", { count })}
                </span>
              </div>
              <span className={`truncate text-center text-p-xs ${now ? "font-semibold text-ink" : "text-muted"}`}>
                {name.format(monthDate(month))}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-label-sm">{t("customers")}</h3>
          <p className="flex gap-4 text-label-sm">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="size-2.5 rounded-full bg-pine" />
              {t("new", { count: customers.new })}
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="size-2.5 rounded-full bg-brand ring-1 ring-ink/20" />
              {t("returning", { count: customers.returning })}
            </span>
          </p>
        </div>
        <div className="mt-2 flex h-3 gap-1 overflow-hidden rounded-full bg-subtle">
          {people > 0 && (
            <>
              <span ref={sized("width", (customers.new / people) * 100)} className="grows rounded-full bg-pine" />
              <span ref={sized("width", (customers.returning / people) * 100)} className="grows rounded-full bg-brand" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const BARS = ["h-1/4", "h-2/5", "h-1/3", "h-3/5", "h-4/5", "h-1/2"];

function MonthLoading({ title, className }: { title: string; className: string }) {
  return (
    <section
      aria-busy="true"
      className={`flex flex-col gap-6 rounded-sheet border border-border bg-surface p-5 lg:p-6 ${className}`}
    >
      <div>
        <h2 className="text-label-md">{title}</h2>
        <Skeleton className="mt-1.5 h-11 w-20" />
      </div>
      <ul className="flex h-36 gap-2 lg:gap-3">
        {BARS.map((height, index) => (
          <li key={index} className="grid min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2">
            <div className="flex items-end">
              <Skeleton className={`w-full rounded-t-lg rounded-b-sm ${height}`} />
            </div>
            <Skeleton className="mx-auto h-3.5 w-8" />
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-3 w-full rounded-full!" />
      </div>
    </section>
  );
}
