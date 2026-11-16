import type { ReactNode } from "react";
import { BarChart, ChangeBadge } from "@/components/bar-chart";
import { RollingNumber } from "@/components/ui/rolling-number";
import type { components } from "@/lib/api/schema";

type Series = components["schemas"]["OverviewSeriesDto"];

// ADR 0161: a total, this week's newcomers against last week's so far, and
// 12 weeks of bars.
export function GrowthTile({
  title,
  series,
  caption,
  chartLabel,
  bar,
  className,
  children,
}: {
  title: string;
  series: Series;
  caption: string;
  chartLabel: string;
  bar: (week: string, count: number) => { label: string; description: string; tooltip: string };
  className: string;
  children?: ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-6 rounded-sheet border border-border bg-surface p-5 lg:p-6 ${className}`}>
      <div>
        <h2 className="text-label-md">{title}</h2>
        <p className="text-[3rem] leading-[3.5rem] font-bold tracking-tight">
          <RollingNumber value={series.total} />
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <ChangeBadge change={series.weeks.at(-1)!.count} />
          <span className="text-p-xs text-muted">{caption}</span>
        </p>
      </div>
      <BarChart
        label={chartLabel}
        bars={series.weeks.map(({ week, count }) => ({ key: week, value: count, ...bar(week, count) }))}
      />
      {children}
    </section>
  );
}
