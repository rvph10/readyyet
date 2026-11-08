import { useTranslations } from "next-intl";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { components } from "@/lib/api/schema";
import { TicketRow } from "../tickets/ticket-row";

type OverviewTicket = components["schemas"]["OverviewTicketDto"];

export const UP_NEXT = 6;

// ADR 0116: the most urgent open Tickets with their next step. Null while they
// load: the tile, its title and its link stand, the rows wait.
export function UpNext({
  tickets,
  open,
  locationId,
  timeZone,
  today,
  className,
}: {
  tickets: OverviewTicket[] | null;
  open: number | null;
  locationId: string;
  timeZone: string;
  today: string;
  className: string;
}) {
  const t = useTranslations("today");
  return (
    <section
      aria-labelledby="up-next-title"
      className={`@container flex flex-col overflow-clip rounded-sheet border border-border bg-surface ${className}`}
    >
      <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3 lg:px-7">
        <div>
          <h2 id="up-next-title" className="text-title-h6">
            {t("upNext")}
          </h2>
          <p className="text-p-sm text-muted">{t("upNextHint")}</p>
        </div>
        <Link href={`/locations/${locationId}/tickets`} className={buttonClass({ variant: "secondary", size: "sm" })}>
          {open === null ? t("allTickets") : t("allOpen", { count: open })}
          <Icon name="arrow-right" className="size-2.5" />
        </Link>
      </div>
      {tickets === null ? (
        <ul aria-busy="true">
          {Array.from({ length: UP_NEXT }, (_, row) => (
            <li
              key={row}
              className="flex items-center gap-3 border-t border-border px-5 py-4 first:border-t-0 lg:min-h-18 lg:px-7 lg:py-3"
            >
              <Skeleton className="size-10 shrink-0 rounded-full! lg:size-12" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="hidden h-8 w-28 rounded-xl! lg:block" />
              <Skeleton className="hidden h-4 w-20 lg:block" />
              <Skeleton className="hidden size-9 rounded-full! lg:block" />
            </li>
          ))}
        </ul>
      ) : tickets.length > 0 ? (
        <ul>
          {tickets.slice(0, UP_NEXT).map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} locationId={locationId} timeZone={timeZone} today={today} />
          ))}
        </ul>
      ) : (
        <EmptyState illustration="chill" title={t("caughtUpTitle")} description={t("caughtUpBody")} />
      )}
    </section>
  );
}
