import { calendarDateIn } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { lastPage, parsePage } from "@/lib/pagination";
import { getLocation } from "../location-data";
import { NewTicketButton } from "../new-ticket/new-ticket-button";
import { PageHeader } from "../page-header";
import { formatDay, parseQuery } from "../tickets/ticket-views";
import { CustomerListHeader, CustomerRow } from "./customer-row";
import { CustomerSearch } from "./customer-search";
import { customersHref } from "./customer-views";

const PAGE_SIZE = 30;

// ADR 0097: for looking someone up, so A to Z. The work itself is on Tickets.
export default async function CustomersPage({ params, searchParams }: PageProps<"/locations/[locationId]/customers">) {
  const [{ locationId }, search, t, locale, client] = await Promise.all([
    params,
    searchParams,
    getTranslations("customers"),
    getLocale(),
    api(),
  ]);
  const q = parseQuery(search.q);
  const page = parsePage(search.page);
  const [list, { timeZone }] = await Promise.all([
    client
      .GET("/locations/{locationId}/customers", {
        params: { path: { locationId }, query: { q: q || undefined, page, take: PAGE_SIZE } },
      })
      .then(pageData),
    getLocation(locationId),
  ]);

  // Customers were erased, and this page is now past the last one.
  if (page > 1 && list.items.length === 0) {
    redirect(customersHref(locationId, { q, page: lastPage(list.total, PAGE_SIZE) }));
  }

  const today = calendarDateIn(new Date(), timeZone);
  return (
    <>
      <PageHeader locationId={locationId} title={t("title")} subtitle={q ? t("resultsFor", { query: q }) : undefined} />
      {search.erased && <Banner>{t("erased")}</Banner>}
      <Panel padding="none" className="flex flex-1 flex-col overflow-clip">
        <div className="px-5 pt-5 pb-4 lg:px-7 lg:pt-6">
          <CustomerSearch key={q} locationId={locationId} action={customersHref(locationId)} query={q} />
        </div>
        {list.items.length > 0 ? (
          <>
            <CustomerListHeader />
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
              <Link href={customersHref(locationId)} className={buttonClass({ variant: "secondary" })}>
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
            href={(number) => customersHref(locationId, { q, page: number })}
            className="mt-auto border-t border-border px-5 py-3 lg:px-7"
          />
        )}
      </Panel>
    </>
  );
}
