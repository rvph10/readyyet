import { ERASED_CUSTOMER_NAME, ERASED_TICKET_TITLE } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { MemberAvatar } from "@/components/member-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { components } from "@/lib/api/schema";
import { statusLabel } from "@/lib/status-label";

type Activity = components["schemas"]["InsightsActivityDto"];

const LOADING_ROWS = 4;

// ADR 0116: who did what lately, for the colleague who comes in after them.
// Each picture leads to that colleague's card and profile (ADR 0142).
export function ActivityTile({
  activity,
  locationId,
  when,
  className,
}: {
  // Null while it loads: the tile and its title stand, the rows wait.
  activity: Activity[] | null;
  locationId: string;
  when: (instant: string) => string;
  className: string;
}) {
  const t = useTranslations("today.activity");
  const tTickets = useTranslations("tickets");
  const locale = useLocale();

  return (
    <section
      className={`flex min-h-0 flex-col overflow-clip rounded-sheet border border-border bg-surface ${className}`}
    >
      <h2 className="px-5 pt-5 pb-2 text-title-h6 lg:px-6">{t("title")}</h2>
      {activity === null ? (
        <ul aria-busy="true" className="flex flex-col gap-1 px-5 pb-5 lg:px-6">
          {Array.from({ length: LOADING_ROWS }, (_, row) => (
            <li key={row} className="flex gap-3 py-3">
              <Skeleton className="size-8 shrink-0 rounded-full!" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-7 w-28 rounded-xl!" />
              </div>
            </li>
          ))}
        </ul>
      ) : activity.length === 0 ? (
        <EmptyState illustration="coffee" title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {activity.map((event) => {
            const customer =
              event.customerName === ERASED_CUSTOMER_NAME ? tTickets("erasedCustomer") : event.customerName;
            const title = event.ticketTitle === ERASED_TICKET_TITLE ? tTickets("erasedTicket") : event.ticketTitle;
            // The picture says who, and opens their card (ADR 0142); the rest
            // of the row leads to the Ticket.
            return (
              <li
                key={event.id}
                className="relative flex gap-3 rounded-card px-2 py-3 transition-colors hover:bg-subtle"
              >
                <MemberAvatar
                  locationId={locationId}
                  member={{ id: event.changedBy, name: event.changedByName, avatarUrl: event.changedByAvatarUrl }}
                />
                <Link
                  href={`/locations/${locationId}/tickets/${event.ticketId}`}
                  className="flex min-w-0 flex-1 flex-col gap-1.5 after:absolute after:inset-0 after:rounded-card"
                >
                  <span className="text-p-sm">
                    {event.status.code === "RECEIVED" ? t("created") : t("moved")}{" "}
                    <span className="font-semibold">{title}</span>
                    <span className="text-muted"> · {customer}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusPill code={event.status.code} label={statusLabel(event.status, locale)} />
                    <span className="text-p-xs text-muted">{when(event.createdAt)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
