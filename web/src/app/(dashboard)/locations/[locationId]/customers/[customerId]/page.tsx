import { calendarDateIn } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { Banner } from "@/components/ui/banner";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { parsePage } from "@/lib/pagination";
import { statusLabel } from "@/lib/status-label";
import { getLocation } from "../../location-data";
import { PageHeader } from "../../page-header";
import { formatDay } from "../../tickets/ticket-views";
import { customersHref, emailFails } from "../customer-views";
import { CustomerCard } from "./customer-card";

const PAGE_SIZE = 50;
// More than a shop can have open for one Customer.
const MOST_OPEN = 100;

function Stat({ label, value, sub, lime }: { label: string; value: number; sub: string; lime?: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-col items-start rounded-sheet border p-4 lg:p-6 ${
        lime ? "border-brand bg-brand" : "border-border bg-surface"
      }`}
    >
      <span className="text-label-sm">{label}</span>
      <span className="mt-2 text-[2.5rem] leading-[3rem] font-bold tracking-tight lg:text-[3.25rem] lg:leading-[3.75rem]">
        {value}
      </span>
      <span className={`mt-0.5 text-p-sm ${lime ? "text-ink" : "text-muted"}`}>{sub}</span>
    </div>
  );
}

// ADR 0097: who they are and how to reach them, and everything they brought in.
export default async function CustomerPage({
  params,
  searchParams,
}: PageProps<"/locations/[locationId]/customers/[customerId]">) {
  const [{ locationId, customerId }, search, t, tDetail, locale, client] = await Promise.all([
    params,
    searchParams,
    getTranslations("customers"),
    getTranslations("ticketDetail"),
    getLocale(),
    api(),
  ]);
  const page = parsePage(search.page);
  const listTickets = (query: { state?: "open"; page?: number; take: number }) =>
    client
      .GET("/locations/{locationId}/tickets", {
        params: { path: { locationId }, query: { customerId, ...query } },
      })
      .then(pageData);

  const [customer, location, open, tickets] = await Promise.all([
    client
      .GET("/locations/{locationId}/customers/{customerId}", { params: { path: { locationId, customerId } } })
      .then(pageData),
    getLocation(locationId),
    listTickets({ state: "open", take: MOST_OPEN }),
    listTickets({ page, take: PAGE_SIZE }),
  ]);
  const href = `${customersHref(locationId)}/${customerId}`;
  if (page > 1 && tickets.items.length === 0) {
    redirect(href);
  }

  const { timeZone } = location;
  const today = calendarDateIn(new Date(), timeZone);
  const day = (instant: string) => formatDay(calendarDateIn(new Date(instant), timeZone), today, locale);
  const ready = open.items.filter(({ currentStatus }) => currentStatus.code === "READY").length;

  return (
    <>
      <PageHeader locationId={locationId} title={customer.fullName} backHref={customersHref(locationId)} />
      {customer.email && emailFails(customer) && (
        <Banner tone="error">{tDetail("emailFails", { email: customer.email, name: customer.fullName })}</Banner>
      )}
      <div className="grid flex-1 grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-3 xl:grid-rows-[auto_minmax(0,1fr)]">
        <Panel as="section" padding="lg" className="col-span-2 flex flex-col xl:col-span-1 xl:row-span-2">
          <CustomerCard
            locationId={locationId}
            customer={customer}
            locationLocale={location.locale}
            country={location.address?.addressCountry}
            since={day(customer.createdAt)}
            openTickets={open.items.length}
          />
        </Panel>
        <Stat label={t("readyLabel")} value={ready} sub={ready ? t("readyHint") : t("nothingReady")} lime={ready > 0} />
        <Stat label={t("inShopLabel")} value={open.items.length - ready} sub={t("inShopHint")} />
        <Panel
          as="section"
          aria-labelledby="customer-tickets"
          className="col-span-2 flex flex-col md:min-h-96 xl:min-h-0"
        >
          <h2 id="customer-tickets" className="text-title-h6">
            {t("tickets")}
          </h2>
          {/* It only grows, so it scrolls inside its tile. */}
          <ul className="-mx-2 mt-3 flex min-h-0 flex-col gap-1 overflow-y-auto px-2 max-md:max-h-96 md:grow md:basis-0">
            {tickets.items.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/locations/${locationId}/tickets/${ticket.id}`}
                  className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-subtle"
                >
                  <span className="min-w-0 flex-1">
                    <span title={ticket.title} className="block truncate text-label-sm">
                      {ticket.title}
                    </span>
                    <span className="block truncate text-p-xs text-muted">
                      #{ticket.id} · {t("received", { date: day(ticket.createdAt) })}
                    </span>
                  </span>
                  <StatusPill code={ticket.currentStatus.code} label={statusLabel(ticket.currentStatus, locale)} />
                  <Icon name="arrow-right" className="size-2.5 shrink-0 text-muted max-md:hidden" />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={tickets.total}
            href={(number) => (number > 1 ? `${href}?page=${number}` : href)}
            className="border-t border-border pt-3"
          />
        </Panel>
      </div>
    </>
  );
}
