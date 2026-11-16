"use client";

import { useTranslations } from "next-intl";
import type { components } from "@/lib/api/schema";
import { sized } from "@/lib/sized";

type Locations = components["schemas"]["OverviewLocationsDto"];

const STATES = [
  { key: "paying", dot: "bg-pine" },
  { key: "trial", dot: "bg-brand ring-1 ring-ink/20" },
  { key: "pastDue", dot: "bg-warning" },
  { key: "inactive", dot: "bg-border-strong" },
] as const;

// Where the Locations stand with their subscription, the way to paying.
export function SubscriptionSplit({ locations }: { locations: Locations }) {
  const t = useTranslations("admin.overview.states");
  const total = STATES.reduce((sum, { key }) => sum + locations[key], 0);
  return (
    <div className="mt-auto">
      <div className="flex h-3 gap-1 overflow-hidden rounded-full bg-subtle">
        {total > 0 &&
          STATES.filter(({ key }) => locations[key] > 0).map(({ key, dot }) => (
            <span
              key={key}
              ref={sized("width", (locations[key] / total) * 100)}
              className={`grows rounded-full ${dot}`}
            />
          ))}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {STATES.map(({ key, dot }) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`size-2.5 shrink-0 rounded-full ${dot}`} />
            <dt className="truncate text-p-sm">{t(key)}</dt>
            <dd className="ml-auto text-label-md font-bold">{locations[key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
