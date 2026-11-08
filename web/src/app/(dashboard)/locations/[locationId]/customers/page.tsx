import { calendarDateIn } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RowsPlaceholder } from "@/components/rows-placeholder";
import { Banner } from "@/components/ui/banner";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { lastPage, parsePage } from "@/lib/pagination";
import { parseSort, type Sort } from "@/lib/sort";
import { getLocation } from "../location-data";
import { NewTicketButton } from "../new-ticket/new-ticket-button";
import { PageHeader } from "../page-header";
import { formatDay, parseQuery } from "../tickets/ticket-views";
import { CustomerListHeader, CustomerRow } from "./customer-row";
import { CustomerSearch } from "./customer-search";
import { CUSTOMER_SORTS, customersHref, type CustomerSort } from "./customer-views";

const PAGE_SIZE = 30;
const ROWS_WHILE_LOADING = 9;
const A_TO_Z: Sort<CustomerSort> = { column: "name", dir: "asc" };

interface Query {
  locationId: string;
  q: string;
  page: number;
  sort: Sort<CustomerSort> | null;
}

// ADR 0097: for looking someone up, so A to Z. The work itself is on Tickets.
// ADR 0119: the search stands at once, the list waits for its rows.
export default async function CustomersPage({ params, searchParams }: PageProps<"/locations/[locationId]/customers">) {
  const [{ locationId }, search, t] = await Promise.all([params, searchParams, getTranslations("customers")]);
  const query: Query = {
    locationId,
    q: parseQuery(search.q),
    page: parsePage(search.page),
    sort: parseSort(search, CUSTOMER_SORTS),
  };
  const { q, sort } = query;

  return (
    <>
      <PageHeader title={t("title")} subtitle={q ? t("resultsFor", { query: q }) : undefined} />
      {search.erased && <Banner>{t("erased")}</Banner>}
      <Panel padding="none" className="flex flex-1 flex-col overflow-clip">
        <div className="px-5 pt-5 pb-4 lg:px-7 lg:pt-6">
          <CustomerSearch key={q} locationId={locationId} action={customersHref(locationId)} query={q} sort={sort} />
        </div>
        {/* Keyed, so another search or page shows its rows loading straight away. */}
        <Suspense
          key={`${q}:${query.page}:${sort?.column}:${sort?.dir}`}
          fallback={
            <>
              <CustomerListHeader sort={sort ?? A_TO_Z} href={(next) => customersHref(locationId, { q, sort: next })} />
              <RowsPlaceholder rows={ROWS_WHILE_LOADING} />
            </>
          }
        >
          <CustomerList query={query} />
        </Suspense>
      </Panel>
    </>
  );
}

async function CustomerList({ query }: { query: Query }) {
  const { locationId, q, page, sort } = query;
  const [t, locale, client] = await Promise.all([getTranslations("customers"), getLocale(), api()]);
  const [list, { timeZone }] = await Promise.all([
    client
      .GET("/locations/{locationId}/customers", {
        params: {
          path: { locationId },
          query: { q: q || undefined, page, take: PAGE_SIZE, sort: sort?.column, dir: sort?.dir },
        },
      })
      .then(pageData),
    getLocation(locationId),
  ]);

  // Customers were erased, and this page is now past the last one.
  if (page > 1 && list.items.length === 0) {
    redirect(customersHref(locationId, { q, sort, page: lastPage(list.total, PAGE_SIZE) }));
  }

  const today = calendarDateIn(new Date(), timeZone);
  return (
    <>
      {list.items.length > 0 ? (
        <>
          <CustomerListHeader sort={sort ?? A_TO_Z} href={(next) => customersHref(locationId, { q, sort: next })} />
          <ul>
            {list.items.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                href={`${customersHref(locationId)}/${customer.id}`}
                since={formatDay(calendarDateIn(new Date(customer.createdAt), timeZone), today, locale)}
              />
            ))}
          </ul>
        </>
      ) : q ? (
        <EmptyState
          illustration="search"
          title={t("noMatch", { query: q })}
          description={t("noMatchHint")}
          action={
            <Link href={customersHref(locationId, { sort })} className={buttonClass({ variant: "secondary" })}>
              {t("clearSearch")}
            </Link>
          }
        />
      ) : (
        <EmptyState
          illustration="user"
          title={t("empty.title")}
          description={t("empty.description")}
          action={<NewTicketButton />}
        />
      )}
      {list.total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={list.total}
          href={(number) => customersHref(locationId, { q, sort, page: number })}
          className="mt-auto border-t border-border px-5 py-3 lg:px-7"
        />
      )}
    </>
  );
}
