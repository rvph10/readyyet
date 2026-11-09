import { calendarDateIn } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";
import { StatusPill } from "@/components/status-pill";
import { Banner } from "@/components/ui/banner";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { parsePage } from "@/lib/pagination";
import { statusLabel } from "@/lib/status-label";
import { getLocation } from "../../location-data";
import { PageHeader } from "../../page-header";
import { formatDay } from "../../tickets/ticket-views";
import { customersHref, emailFails } from "../customer-views";
import { CustomerCard } from "./customer-card";
import { Reveal } from "@/components/reveal";

const PAGE_SIZE = 50;
// More than a shop can have open for one Customer.
const MOST_OPEN = 100;
const ROWS_WHILE_LOADING = 6;

// The header, the card and the stats all read these, once per request.
const getCustomer = cache(async (locationId: string, customerId: string) =>
  pageData(
    await (
      await api()
    ).GET("/locations/{locationId}/customers/{customerId}", { params: { path: { locationId, customerId } } }),
  ),
);
const getOpenTickets = cache(async (locationId: string, customerId: string) =>
  pageData(
    await (
      await api()
    ).GET("/locations/{locationId}/tickets", {
      params: { path: { locationId }, query: { customerId, state: "open", take: MOST_OPEN } },
    }),
  ),
);

function Stat({
  label,
  value,
  sub,
  lime,
}: {
  label: string;
  // Null while it loads.
  value: number | null;
  sub: string | null;
  lime?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col items-start rounded-sheet border p-4 lg:p-6 ${
        lime ? "border-brand bg-brand" : "border-border bg-surface"
      }`}
    >
      <span className="text-label-sm">{label}</span>
      <span className="mt-2 flex h-12 items-center text-[2.5rem] leading-[3rem] font-bold tracking-tight lg:h-15 lg:text-[3.25rem] lg:leading-[3.75rem]">
        {value ?? <Skeleton className="h-3/5 w-14" />}
      </span>
      {sub === null ? (
        <Skeleton className="mt-1.5 h-3.5 w-36 max-w-full" />
      ) : (
        <span className={`mt-0.5 text-p-sm ${lime ? "text-ink" : "text-muted"}`}>{sub}</span>
      )}
    </div>
  );
}

// ADR 0097: who they are and how to reach them, and everything they brought in.
// ADR 0119: each tile waits for its own part.
export default async function CustomerPage({
  params,
  searchParams,
}: PageProps<"/locations/[locationId]/customers/[customerId]">) {
  const [{ locationId, customerId }, search, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("customers"),
  ]);
  const page = parsePage(search.page);
  const ids = { locationId, customerId };

  return (
    <>
      <Reveal fallback={<PageHeader title={null} />}>
        <Header {...ids} />
      </Reveal>
      <div className="grid flex-1 grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-3 xl:grid-rows-[auto_minmax(0,1fr)]">
        <Panel as="section" padding="lg" className="col-span-2 flex flex-col xl:col-span-1 xl:row-span-2">
          <Reveal fallback={<CardLoading />}>
            <Card {...ids} />
          </Reveal>
        </Panel>
        <Reveal fallback={<StatsLoading />}>
          <Stats {...ids} />
        </Reveal>
        <Panel
          as="section"
          aria-labelledby="customer-tickets"
          className="col-span-2 flex flex-col md:min-h-96 xl:min-h-0"
        >
          <h2 id="customer-tickets" className="text-title-h6">
            {t("tickets")}
          </h2>
          <Reveal key={page} fallback={<TicketsLoading />}>
            <TicketList {...ids} page={page} />
          </Reveal>
        </Panel>
      </div>
    </>
  );
}

async function Header({ locationId, customerId }: { locationId: string; customerId: string }) {
  const [customer, tDetail] = await Promise.all([getCustomer(locationId, customerId), getTranslations("ticketDetail")]);
  return (
    <>
      <PageHeader title={customer.fullName} crumb={customer.fullName} />
      {customer.email && emailFails(customer) && (
        <Banner tone="error">{tDetail("emailFails", { email: customer.email, name: customer.fullName })}</Banner>
      )}
    </>
  );
}

async function Card({ locationId, customerId }: { locationId: string; customerId: string }) {
  const [customer, location, open, locale] = await Promise.all([
    getCustomer(locationId, customerId),
    getLocation(locationId),
    getOpenTickets(locationId, customerId),
    getLocale(),
  ]);
  const today = calendarDateIn(new Date(), location.timeZone);
  return (
    <CustomerCard
      locationId={locationId}
      customer={customer}
      locationLocale={location.locale}
      country={location.address?.addressCountry}
      since={formatDay(calendarDateIn(new Date(customer.createdAt), location.timeZone), today, locale)}
      openTickets={open.items.length}
    />
  );
}

function CardLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <Skeleton className="size-20 rounded-full!" />
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="h-4 w-40 max-w-full" />
      <Skeleton className="mt-4 h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

async function Stats({ locationId, customerId }: { locationId: string; customerId: string }) {
  const [open, t] = await Promise.all([getOpenTickets(locationId, customerId), getTranslations("customers")]);
  const ready = open.items.filter(({ currentStatus }) => currentStatus.code === "READY").length;
  return (
    <>
      <Stat label={t("readyLabel")} value={ready} sub={ready ? t("readyHint") : t("nothingReady")} lime={ready > 0} />
      <Stat label={t("inShopLabel")} value={open.items.length - ready} sub={t("inShopHint")} />
    </>
  );
}

function StatsLoading() {
  const t = useTranslations("customers");
  return (
    <>
      <Stat label={t("readyLabel")} value={null} sub={null} />
      <Stat label={t("inShopLabel")} value={null} sub={null} />
    </>
  );
}

async function TicketList({ locationId, customerId, page }: { locationId: string; customerId: string; page: number }) {
  const [t, locale, client, location] = await Promise.all([
    getTranslations("customers"),
    getLocale(),
    api(),
    getLocation(locationId),
  ]);
  const tickets = await client
    .GET("/locations/{locationId}/tickets", {
      params: { path: { locationId }, query: { customerId, page, take: PAGE_SIZE } },
    })
    .then(pageData);
  const href = `${customersHref(locationId)}/${customerId}`;
  if (page > 1 && tickets.items.length === 0) {
    redirect(href);
  }
  const today = calendarDateIn(new Date(), location.timeZone);
  const day = (instant: string) => formatDay(calendarDateIn(new Date(instant), location.timeZone), today, locale);

  return (
    <>
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
    </>
  );
}

function TicketsLoading() {
  return (
    <ul aria-busy="true" className="mt-3 flex flex-col gap-1">
      {Array.from({ length: ROWS_WHILE_LOADING }, (_, row) => (
        <li key={row} className="flex items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-64 max-w-full" />
            <Skeleton className="h-3.5 w-40 max-w-full" />
          </div>
          <Skeleton className="h-8 w-28 rounded-xl!" />
        </li>
      ))}
    </ul>
  );
}
