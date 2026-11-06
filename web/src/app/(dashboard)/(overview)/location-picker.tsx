"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { SearchField } from "@/components/ui/search-field";
import type { components } from "@/lib/api/schema";
import { matchesSearch, type groupByBusiness, type Membership } from "@/lib/memberships";

type Counts = components["schemas"]["OverviewCountsDto"];

// A search box only earns its place once the tiles no longer fit a glance.
const SEARCH_FROM = 7;

// A Business takes the columns its Locations need, so two small ones share a
// row and every tile keeps the same width. Written out for Tailwind to find.
const sectionSpans = ["", "md:col-span-2", "md:col-span-2 lg:col-span-3"];
const tileColumns = ["", "md:grid-cols-2", "md:grid-cols-2 lg:grid-cols-3"];

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <span className={`flex min-w-0 flex-col rounded-2xl px-4 py-3 ${tone}`}>
      <span className="text-title-h4">{value}</span>
      <span className="truncate text-label-xs">{label}</span>
    </span>
  );
}

function LocationTile({ membership, counts }: { membership: Membership; counts: Counts | null }) {
  const t = useTranslations("dashboard");
  const tToday = useTranslations("today");
  const { role, location } = membership;
  const { business } = location;
  return (
    <Link
      href={`/locations/${location.id}`}
      className="group flex h-full flex-col gap-5 rounded-sheet border border-border bg-surface p-5 transition-[border-color,scale] hover:border-border-strong active:scale-[0.99]"
    >
      <span className="flex items-start gap-3">
        <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" />
        <span className="min-w-0 flex-1">
          <span title={location.name} className="block truncate text-title-h6">
            {location.name}
          </span>
          <span className="mt-1 block">
            <Badge>{t(`roles.${role}`)}</Badge>
          </span>
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle transition-colors group-hover:bg-pine group-hover:text-brand">
          <Icon name="arrow-right" className="size-3" />
        </span>
      </span>
      {counts ? (
        <span className="mt-auto grid grid-cols-2 gap-2">
          <Stat
            value={counts.ready}
            label={tToday("filters.ready")}
            tone={counts.ready > 0 ? "bg-brand" : "bg-subtle"}
          />
          <Stat
            value={counts.late}
            label={tToday("filters.late")}
            tone={counts.late > 0 ? "bg-danger-subtle text-danger" : "bg-subtle"}
          />
        </span>
      ) : (
        <span className="mt-auto rounded-2xl bg-subtle px-4 py-3 text-p-sm text-muted">{t("countsUnavailable")}</span>
      )}
    </Link>
  );
}

interface Props {
  title: string;
  subtitle: string;
  groups: ReturnType<typeof groupByBusiness>;
  counts: Record<string, Counts | null>;
}

export function LocationPicker({ title, subtitle, groups, counts }: Props) {
  const t = useTranslations("dashboard");
  const [query, setQuery] = useState("");
  const shown = groups
    .map((group) => ({ ...group, memberships: group.memberships.filter((item) => matchesSearch(item, query)) }))
    .filter((group) => group.memberships.length > 0);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-title-h5 wrap-anywhere md:text-title-h4">{title}</h1>
          <p className="text-p-sm text-muted">{subtitle}</p>
        </div>
        {Object.keys(counts).length >= SEARCH_FROM && (
          <SearchField
            label={t("searchLocations")}
            placeholder={t("searchLocations")}
            value={query}
            onChange={setQuery}
            className="w-full sm:w-72"
          />
        )}
      </header>
      {shown.length > 0 ? (
        <div className="grid grid-flow-dense grid-cols-1 gap-x-5 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ business, memberships, owned }) => {
            const span = Math.min(memberships.length, 3) - 1;
            return (
              <section key={business.id} aria-labelledby={`business-${business.id}`} className={sectionSpans[span]}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <h2 id={`business-${business.id}`} className="min-w-0 text-label-lg wrap-anywhere">
                    {business.name}
                  </h2>
                  {owned && (
                    // Short on screen, as a Business can be one tile wide.
                    <span className="flex shrink-0 gap-4">
                      <Link
                        href={`/businesses/${business.id}/locations/new`}
                        aria-label={t("addLocation")}
                        className={`${buttonClass({ variant: "link" })} inline-flex items-center gap-1.5`}
                      >
                        <Icon name="add" className="size-2.5" />
                        {t("add")}
                      </Link>
                      <Link
                        href={`/businesses/${business.id}`}
                        aria-label={t("businessSettings")}
                        className={buttonClass({ variant: "link" })}
                      >
                        {t("sections.settings")}
                      </Link>
                    </span>
                  )}
                </div>
                <ul className={`grid grid-cols-1 gap-5 ${tileColumns[span]}`}>
                  {memberships.map((membership) => (
                    <li key={membership.location.id}>
                      <LocationTile membership={membership} counts={counts[membership.location.id]} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="search" title={t("noLocationFound")} description={t("noLocationFoundHint")} />
      )}
    </>
  );
}
