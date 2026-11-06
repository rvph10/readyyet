"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { LocationTile, type LocationCounts } from "@/components/location-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { matchesName } from "@/lib/memberships";

// A search box only earns its place once the tiles no longer fit a glance.
const SEARCH_FROM = 7;

interface Props {
  business: { id: string; name: string; logoUrl: string | null };
  locations: { id: string; name: string; badge: ReactNode; counts: LocationCounts | null }[];
}

export function BusinessLocations({ business, locations }: Props) {
  const t = useTranslations("dashboard");
  const [query, setQuery] = useState("");
  const shown = locations.filter(({ name }) => matchesName(name, query));
  return (
    <>
      {locations.length >= SEARCH_FROM && (
        <SearchField
          label={t("searchLocations")}
          placeholder={t("searchLocations")}
          value={query}
          onChange={setQuery}
          className="w-full sm:w-72"
        />
      )}
      {shown.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-3">
          {shown.map(({ id, ...location }) => (
            <li key={id}>
              <LocationTile id={id} business={business} {...location} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState illustration="search" title={t("noLocationFound")} description={t("noLocationFoundHint")} />
      )}
    </>
  );
}
