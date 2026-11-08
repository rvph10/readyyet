"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { components } from "@/lib/api/schema";

export type LocationCounts = components["schemas"]["OverviewCountsDto"];

// A share of the open Tickets, its width through the CSSOM, which the CSP allows
// (ADR 0048).
function Segment({ share, tone }: { share: number; tone: string }) {
  if (share === 0) return null;
  return (
    <span
      ref={(bar) => {
        if (bar) bar.style.flexGrow = String(share);
      }}
      className={`min-w-1.5 basis-0 rounded-full ${tone}`}
    />
  );
}

function Legend({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-label-xs font-semibold">
      <span className={`size-2.5 rounded-full ${tone}`} />
      {children}
    </span>
  );
}

interface Props {
  id: string;
  name: string;
  // The User's Role, or for an Owner a plan that needs a look. Nothing when all's well.
  badge?: ReactNode;
  counts: LocationCounts | null;
  // ADR 0119: the tile and its name stand, its numbers wait.
  loading?: boolean;
}

// ADR 0110: what's in a shop decides if it's worth opening, so one number and
// where those Tickets stand. Everything else is on the shop's own Today.
export function LocationTile({ id, name, badge, counts, loading = false }: Props) {
  const t = useTranslations("dashboard");
  const tToday = useTranslations("today");
  return (
    <Link
      href={`/locations/${id}`}
      className="group flex h-full min-h-56 flex-col rounded-sheet border border-border bg-surface p-5 transition-[border-color,scale] hover:border-pine active:scale-[0.99] lg:p-6"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span title={name} className="block truncate text-title-h5">
            {name}
          </span>
          {badge && <span className="mt-1.5 block">{badge}</span>}
        </span>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-subtle transition-colors group-hover:bg-pine group-hover:text-brand">
          <Icon name="arrow-right" className="size-3" />
        </span>
      </span>
      {loading ? (
        <span aria-busy="true" className="mt-auto flex flex-col gap-3 pt-6">
          <Skeleton className="h-14 w-28" />
          <Skeleton className="h-3 w-full rounded-full!" />
          <Skeleton className="h-5 w-32" />
        </span>
      ) : counts ? (
        <span className="mt-auto flex flex-col gap-3 pt-6">
          <span className="flex items-baseline gap-2">
            <span className="text-[3.25rem] leading-[3.5rem] font-bold tracking-tight">{counts.open}</span>
            <span className="text-label-sm text-muted">{t("openCount", { count: counts.open })}</span>
          </span>
          <span className="flex h-3 gap-0.5">
            {counts.open === 0 ? (
              <span className="flex-1 rounded-full bg-subtle" />
            ) : (
              <>
                <Segment share={counts.ready} tone="bg-brand" />
                <Segment share={counts.late} tone="bg-danger" />
                <Segment share={Math.max(counts.open - counts.ready - counts.late, 0)} tone="bg-pine" />
              </>
            )}
          </span>
          <span className="flex min-h-5 flex-wrap gap-x-4 gap-y-1">
            {counts.ready > 0 && <Legend tone="bg-brand">{t("tileReady", { count: counts.ready })}</Legend>}
            {counts.late > 0 && <Legend tone="bg-danger">{t("tileLate", { count: counts.late })}</Legend>}
            {counts.ready === 0 && counts.late === 0 && (
              <span className="text-label-xs text-muted">{tToday("nothingLate")}</span>
            )}
          </span>
        </span>
      ) : (
        <span className="mt-auto rounded-2xl bg-subtle px-4 py-3 text-p-sm text-muted">{t("countsUnavailable")}</span>
      )}
    </Link>
  );
}
