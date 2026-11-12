import { calendarDateIn, ERASED_CUSTOMER_NAME, ERASED_TICKET_TITLE, isEndedStatus } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { PhoneNumber } from "@/components/phone-number";
import { StatusPill } from "@/components/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { SortHeader } from "@/components/ui/sort-header";
import type { components } from "@/lib/api/schema";
import type { Sort } from "@/lib/sort";
import { statusLabel } from "@/lib/status-label";
import { NextStep } from "../next-step";
import { daysBetween, expected, formatDay, waitTone, type ListSort } from "./ticket-views";

type ListTicket = components["schemas"]["TicketListItemDto"];
type OverviewTicket = components["schemas"]["OverviewTicketDto"];

// In a narrow tile, like Today's on a small laptop, the next step drops its word.
// A long title shortens, the whole value on hover.
const QUEUE_GRID =
  "lg:grid-cols-[minmax(0,1fr)_8.5rem_7rem_3rem] lg:gap-x-4 lg:@3xl:grid-cols-[minmax(0,1fr)_9.5rem_7.5rem_10rem]";
const LIST_GRID =
  "lg:grid-cols-[4.5rem_minmax(12rem,1fr)_minmax(0,1.3fr)_11rem_9.5rem_5.5rem] lg:gap-x-5 2xl:grid-cols-[4.5rem_minmax(13rem,1fr)_minmax(0,1.5fr)_11rem_9.5rem_6rem_7rem]";

export function ListHeader({ sort, href }: { sort: Sort<ListSort>; href: (sort: Sort<ListSort>) => string }) {
  const t = useTranslations("tickets.columns");
  const header = { sort, href };
  return (
    <div className={`hidden px-7 pb-3 text-p-xs text-muted lg:grid ${LIST_GRID}`}>
      <span>
        <SortHeader {...header} column="number" label="#" first="desc" />
      </span>
      <span>
        <SortHeader {...header} column="customer" label={t("customer")} />
      </span>
      <span>
        <SortHeader {...header} column="title" label={t("ticket")} />
      </span>
      <span>
        <SortHeader {...header} column="status" label={t("status")} />
      </span>
      <span>
        <SortHeader {...header} column="expected" label={t("expected")} />
      </span>
      <span>
        <SortHeader {...header} column="received" label={t("received")} first="desc" />
      </span>
      <span className="hidden 2xl:block">{t("lastUpdate")}</span>
    </div>
  );
}

// One line, whatever the language: the date behind it is on hover.
function When({ ticket, timeZone, today }: { ticket: ListTicket; timeZone: string; today: string }) {
  const t = useTranslations("tickets");
  const locale = useLocale();
  const { code } = ticket.currentStatus;
  if (isEndedStatus(code)) return null;
  const line = (text: string, tone: string, date?: string) => (
    <span
      title={date && formatDay(date, today, locale)}
      className={`block truncate text-label-sm whitespace-nowrap ${tone}`}
    >
      {text}
    </span>
  );
  if (ticket.customerCollectedAt) {
    return line(t("saysCollected"), "text-warning", calendarDateIn(new Date(ticket.customerCollectedAt), timeZone));
  }
  if (code === "READY") {
    const since = calendarDateIn(new Date(ticket.statusSince), timeZone);
    const days = daysBetween(since, today);
    return line(t("waiting", { days }), waitTone(days), since);
  }
  const due = expected(ticket.estimatedReadyDate, code, today);
  if (!due) return line(t("noDate"), "text-muted");
  if (due.key === "late") return line(t("lateBy", { days: daysBetween(due.date, today) }), "text-danger", due.date);
  return line(due.key === "on" ? formatDay(due.date, today, locale) : t(due.key), "", due.date);
}

interface Props {
  ticket: ListTicket | OverviewTicket;
  locationId: string;
  timeZone: string;
  today: string;
  // The Tickets page's columns, for looking one up, rather than Today's.
  list?: boolean;
}

// A table from 1024px, for its column headers and to compare rows at a glance.
// Under that, each row is a card of the same cells. The whole row is the link.
export function TicketRow({ ticket, locationId, timeZone, today, list }: Props) {
  const t = useTranslations("tickets");
  const locale = useLocale();
  const { customer, currentStatus } = ticket;
  const erased = customer.fullName === ERASED_CUSTOMER_NAME;
  const name = erased ? t("erasedCustomer") : customer.fullName;
  const title = ticket.title === ERASED_TICKET_TITLE ? t("erasedTicket") : ticket.title;
  const next = "nextStatus" in ticket ? ticket.nextStatus : null;
  const finishes = next?.code === "COMPLETED";
  const day = (instant: string) => calendarDateIn(new Date(instant), timeZone);

  return (
    <li
      className={`group relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 border-t border-border px-5 py-4 transition-colors first:border-t-0 hover:bg-subtle has-focus-visible:bg-subtle lg:items-center lg:px-7 lg:py-3 ${list ? `lg:min-h-20 ${LIST_GRID}` : `lg:min-h-18 ${QUEUE_GRID}`}`}
    >
      <Link
        href={`/locations/${locationId}/tickets/${ticket.id}`}
        aria-label={title}
        className="absolute inset-0 outline-ink -outline-offset-2 focus-visible:outline-2"
      />
      {list && <span className="hidden text-label-sm text-muted lg:block">#{ticket.id}</span>}
      <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
        <Avatar id={customer.fullName} name={name} src={null} className="lg:size-12! lg:text-base!" />
        <span className="min-w-0">
          <span className="block truncate text-label-md">{name}</span>
          <span title={title} className={`block truncate text-p-xs text-muted ${list ? "lg:hidden" : ""}`}>
            {title}
          </span>
          {list && (
            <span title={customer.email ?? undefined} className="hidden truncate text-p-xs text-muted lg:block">
              {customer.phone ? <PhoneNumber value={customer.phone} /> : (customer.email ?? t("form.noContact"))}
            </span>
          )}
        </span>
      </div>
      {list && (
        <span title={title} className="hidden truncate text-p-sm lg:block">
          {title}
        </span>
      )}
      <span className="flex min-w-0">
        <StatusPill code={currentStatus.code} label={statusLabel(currentStatus, locale)} />
      </span>
      <div className="text-right lg:text-left">
        <When ticket={ticket} timeZone={timeZone} today={today} />
      </div>
      {list ? (
        <>
          <span className="hidden text-p-sm text-muted lg:block">
            {formatDay(day(ticket.createdAt), today, locale)}
          </span>
          <span className="hidden text-p-sm text-muted 2xl:block">
            {formatDay(day(ticket.statusSince), today, locale)}
          </span>
        </>
      ) : (
        next && (
          // Handing over is what a phone at the counter needs too. Other moves
          // stay on the Ticket page there: a button per row doubles the list.
          <div
            className={`relative z-10 min-w-0 items-center justify-end ${finishes ? "col-span-2 flex lg:col-span-1" : "hidden lg:flex"}`}
          >
            <NextStep locationId={locationId} ticketId={ticket.id} next={next} />
          </div>
        )
      )}
    </li>
  );
}
