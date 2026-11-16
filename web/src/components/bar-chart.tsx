"use client";

import { Icon } from "@/components/ui/icon";
import { sized } from "@/lib/sized";

export interface Bar {
  key: string;
  // Under the bar, short. Empty when bars are too many to name each.
  label: string;
  // Read out for the bar, with its period in full.
  description: string;
  // Shown above the bar on hover or focus.
  tooltip: string;
  value: number;
}

// ADR 0116's bars, the last period, the one under way, in solid pine.
export function BarChart({ bars, label }: { bars: Bar[]; label: string }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  return (
    <ul className="flex h-36 gap-2 lg:gap-3" aria-label={label}>
      {bars.map((bar, index) => {
        const now = index === bars.length - 1;
        return (
          <li key={bar.key} className="group/bar grid min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2">
            <div className="relative">
              <span
                role="img"
                tabIndex={0}
                aria-label={bar.description}
                className="absolute inset-0 rounded-t-lg focus-visible:outline-offset-1"
              />
              <div
                ref={sized("height", bar.value === 0 ? 2 : (bar.value / max) * 100)}
                className={`grows pointer-events-none absolute inset-x-0 bottom-0 rounded-t-lg rounded-b-sm ${
                  now ? "bg-pine" : "bg-pine-subtle group-hover/bar:bg-pine/30"
                }`}
              />
              <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-label-xs font-semibold whitespace-nowrap text-surface group-hover/bar:block group-has-focus-visible/bar:block">
                {bar.tooltip}
              </span>
            </div>
            <span className="relative h-4">
              <span
                className={`absolute left-1/2 -translate-x-1/2 text-p-xs whitespace-nowrap ${now ? "font-semibold text-ink" : "text-muted"}`}
              >
                {bar.label}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ChangeBadge({ change }: { change: number }) {
  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-label-sm font-bold ${
        change > 0 ? "bg-brand text-ink" : change < 0 ? "bg-danger-subtle text-danger" : "bg-subtle text-ink"
      }`}
    >
      {change !== 0 && <Icon name={change > 0 ? "arrow-up-1" : "arrow-down-1"} className="size-2.5" />}
      {change > 0 ? `+${change}` : change}
    </span>
  );
}
