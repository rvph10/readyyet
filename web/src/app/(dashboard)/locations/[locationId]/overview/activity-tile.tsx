import { ERASED_CUSTOMER_NAME } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import type { components } from "@/lib/api/schema";
import { statusLabel } from "@/lib/status-label";

type Activity = components["schemas"]["InsightsActivityDto"];

// ADR 0116: who did what lately, for the colleague who comes in after them.
// No counts per person: it's for handing over, not for watching people.
export function ActivityTile({
  activity,
  locationId,
  meId,
  when,
  className,
}: {
  activity: Activity[];
  locationId: string;
  meId: string;
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
      {activity.length === 0 ? (
        <EmptyState illustration="coffee" title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {activity.map((event) => {
            const you = event.changedBy === meId;
            const person = you ? t("you") : event.changedByName.split(" ")[0];
            const customer =
              event.customerName === ERASED_CUSTOMER_NAME ? tTickets("erasedCustomer") : event.customerName;
            return (
              <li key={event.id}>
                <Link
                  href={`/locations/${locationId}/tickets/${event.ticketId}`}
                  className="flex gap-3 rounded-card px-2 py-3 transition-colors hover:bg-subtle"
                >
                  <Avatar id={event.changedBy} name={event.changedByName} src={null} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-p-sm">
                      <span className="font-semibold">{person}</span>{" "}
                      {event.status.code === "RECEIVED" ? t("created") : t("moved")}{" "}
                      <span className="font-semibold">{event.ticketTitle}</span>
                      <span className="text-muted"> · {customer}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusPill code={event.status.code} label={statusLabel(event.status, locale)} />
                      <span className="text-p-xs text-muted">{when(event.createdAt)}</span>
                    </span>
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
