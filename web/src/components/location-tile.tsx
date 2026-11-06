import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import type { components } from "@/lib/api/schema";

export type LocationCounts = components["schemas"]["OverviewCountsDto"];

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <span className={`flex min-w-0 flex-col rounded-2xl px-4 py-3 ${tone}`}>
      <span className="text-title-h4">{value}</span>
      <span className="truncate text-label-xs">{label}</span>
    </span>
  );
}

interface Props {
  id: string;
  name: string;
  business: { id: string; name: string; logoUrl: string | null };
  // Under the name: the User's Role, or for an Owner the plan.
  badge: ReactNode;
  counts: LocationCounts | null;
}

// ADR 0092: which shop needs attention, before opening it.
export function LocationTile({ id, name, business, badge, counts }: Props) {
  const t = useTranslations("dashboard");
  const tToday = useTranslations("today");
  return (
    <Link
      href={`/locations/${id}`}
      className="group flex h-full flex-col gap-5 rounded-sheet border border-border bg-surface p-5 transition-[border-color,scale] hover:border-border-strong active:scale-[0.99]"
    >
      <span className="flex items-start gap-3">
        <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" />
        <span className="min-w-0 flex-1">
          <span title={name} className="block truncate text-title-h6">
            {name}
          </span>
          <span className="mt-1 block">{badge}</span>
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
