"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { LocationTile, type LocationCounts } from "@/components/location-tile";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { matchesSearch, type groupByBusiness } from "@/lib/memberships";

// A search box only earns its place once the tiles no longer fit a glance.
const SEARCH_FROM = 7;

type Group = ReturnType<typeof groupByBusiness>[number];

interface Props {
  title: string;
  subtitle: string;
  group: Group;
  // Only to choose from on a phone, which has no top bar. Empty with just one.
  businesses: Group[];
  // Null while the numbers load: the tiles and their names stand (ADR 0119).
  counts: Record<string, LocationCounts | null> | null;
}

export function LocationPicker({ title, subtitle, group, businesses, counts }: Props) {
  const t = useTranslations("dashboard");
  const [query, setQuery] = useState("");
  const { business } = group;
  const shown = group.memberships.filter((item) => matchesSearch(item, query));

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-title-h5 wrap-anywhere md:text-title-h4">{title}</h1>
          <p className="text-p-sm text-muted">{subtitle}</p>
        </div>
        {group.memberships.length >= SEARCH_FROM && (
          <SearchField
            label={t("searchLocations")}
            placeholder={t("searchLocations")}
            value={query}
            onChange={setQuery}
            className="w-full sm:w-72"
          />
        )}
      </header>
      {businesses.length > 0 && (
        <nav aria-label={t("switchBusinessLabel")} className="-mx-4 flex gap-2 overflow-x-auto px-4 md:hidden">
          {businesses.map((item) => (
            <Link
              key={item.business.id}
              href={`/?business=${item.business.id}`}
              aria-current={item.business.id === business.id ? "true" : undefined}
              className={`flex h-11 shrink-0 items-center rounded-full px-4 text-label-sm whitespace-nowrap ${
                item.business.id === business.id ? "bg-pine text-surface" : "bg-surface text-ink"
              }`}
            >
              {item.business.name}
            </Link>
          ))}
        </nav>
      )}
      <section aria-labelledby="business-name">
        <h2 id="business-name" className="mb-3 min-w-0 text-label-lg wrap-anywhere">
          {business.name}
        </h2>
        {shown.length > 0 ? (
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((membership) => (
              <li key={membership.location.id}>
                <LocationTile
                  id={membership.location.id}
                  name={membership.location.name}
                  badge={<Badge>{t(`roles.${membership.role}`)}</Badge>}
                  counts={counts?.[membership.location.id] ?? null}
                  loading={counts === null}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState illustration="search" title={t("noLocationFound")} description={t("noLocationFoundHint")} />
        )}
      </section>
    </>
  );
}
