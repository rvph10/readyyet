import { calendarDateIn } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { Badge } from "@/components/ui/badge";
import type { components } from "@/lib/api/schema";
import { statusLabel } from "@/lib/status-label";
import { expected, formatDay } from "./ticket-views";

type Ticket = components["schemas"]["TicketListItemDto"];

// A table from 768px, for its column headers and to compare rows at a glance.
// On a phone each row is a card of the same cells. The title's link stretches
// over the whole row.
export function TicketTable({
  tickets,
  locationId,
  timeZone,
  today,
}: {
  tickets: Ticket[];
  locationId: string;
  timeZone: string;
  today: string;
}) {
  const t = useTranslations("tickets");
  const locale = useLocale();

  return (
    <table className="block w-full md:table md:table-fixed">
      <thead className="hidden md:table-header-group">
        <tr className="border-b border-border text-left text-label-xs text-muted">
          <th scope="col" className="py-3 pr-4 pl-5 font-medium">
            {t("columns.ticket")}
          </th>
          <th scope="col" className="w-[24%] py-3 pr-4 font-medium">
            {t("columns.customer")}
          </th>
          <th scope="col" className="w-48 py-3 pr-4 font-medium">
            {t("columns.status")}
          </th>
          <th scope="col" className="w-28 py-3 pr-4 font-medium xl:w-36">
            {t("columns.expected")}
          </th>
          <th scope="col" className="hidden w-28 py-3 pr-5 font-medium xl:table-cell">
            {t("columns.received")}
          </th>
        </tr>
      </thead>
      <tbody className="block divide-y divide-border md:table-row-group">
        {tickets.map((ticket) => {
          const due = expected(ticket.estimatedReadyDate, ticket.currentStatus.code, today);
          return (
            <tr
              key={ticket.id}
              className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 p-4 transition-colors outline-ink -outline-offset-2 last:rounded-b-3xl hover:bg-subtle has-focus-visible:bg-subtle has-focus-visible:outline-2 md:table-row md:p-0"
            >
              <td className="md:py-3.5 md:pr-4 md:pl-5 md:align-top">
                <Link
                  href={`/locations/${locationId}/tickets/${ticket.id}`}
                  className="line-clamp-2 text-label-sm wrap-anywhere after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {ticket.title}
                </Link>
                <p className="mt-0.5 font-mono text-p-xs text-muted">{ticket.trackingCode}</p>
                {ticket.customerCollectedAt && (
                  <p className="mt-1.5">
                    <Badge>{t("customerCollected")}</Badge>
                  </p>
                )}
              </td>
              <td className="col-start-1 line-clamp-2 text-p-sm wrap-anywhere text-muted md:table-cell md:py-3.5 md:pr-4 md:align-top md:text-ink">
                {ticket.customer.fullName}
              </td>
              <td className="col-start-2 row-span-2 row-start-1 max-w-44 md:table-cell md:max-w-none md:py-3.5 md:pr-4 md:align-top">
                <StatusPill code={ticket.currentStatus.code} label={statusLabel(ticket.currentStatus, locale)} />
              </td>
              <td className="col-span-2 text-p-sm empty:hidden md:table-cell md:py-3.5 md:pr-4 md:align-top md:empty:table-cell">
                {due && (
                  <>
                    <span className="text-muted md:hidden">{t("expectedLabel")} </span>
                    <span className={due.key === "late" ? "text-danger" : undefined}>
                      {due.key === "on"
                        ? formatDay(due.date, today, locale)
                        : t(due.key, { date: formatDay(due.date, today, locale) })}
                    </span>
                  </>
                )}
              </td>
              <td className="hidden text-p-sm text-muted xl:table-cell xl:py-3.5 xl:pr-5 xl:align-top">
                {formatDay(calendarDateIn(new Date(ticket.createdAt), timeZone), today, locale)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
