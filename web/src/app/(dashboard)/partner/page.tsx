import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SheetTitle } from "@/components/sheet-title";
import { Banner } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { referralLink } from "@/lib/business";
import { COMMISSION_PILLS, formatCents, formatDate } from "@/lib/commissions";
import { getMe } from "@/lib/me";
import { lastPage, parsePage } from "@/lib/pagination";
import { EarningsChart } from "./earnings-chart";
import { LinkActions, ZoomableQr } from "./link-actions";

const PAGE_SIZE = 10;
const GRID = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-x-5";

const pageHref = (page: number) => (page > 1 ? `/partner?page=${page}` : "/partner");

// ADR 0121: what a sales partner needs, their link first, then what they've
// earned and from which shops (ADR 0032).
export default async function SalesPartnerPage({ searchParams }: PageProps<"/partner">) {
  const [search, me, client, t, locale] = await Promise.all([
    searchParams,
    getMe(),
    api(),
    getTranslations("salesPartner"),
    getLocale(),
  ]);
  const page = parsePage(search.page);
  const [overview, list] = await Promise.all([
    client.GET("/me/sales-partner").then(pageData),
    client.GET("/me/sales-partner/commissions", { params: { query: { take: PAGE_SIZE, page } } }).then(pageData),
  ]);
  if (page > 1 && list.items.length === 0) {
    redirect(pageHref(lastPage(list.total, PAGE_SIZE)));
  }
  const link = await referralLink(overview.referralCode);
  const money = (cents: number) => formatCents(cents, locale);
  const now = new Date();
  const firstName = me.name.split(" ")[0];
  // A new sales partner gets one welcome instead of three empty tiles.
  const nothingYet = overview.businesses.length === 0 && list.total === 0;

  return (
    <>
      <SheetTitle
        title={t("greeting", { name: firstName })}
        subtitle={overview.salesPartner ? t("subtitle") : t("formerSubtitle")}
      />
      {!overview.salesPartner && <Banner>{t("former")}</Banner>}

      <div className="grid grid-cols-1 items-start gap-4 lg:gap-5 xl:grid-cols-12">
        {overview.salesPartner && (
          <section className="flex flex-col gap-6 rounded-sheet bg-pine p-6 text-surface sm:flex-row sm:items-center lg:p-7 xl:col-span-8">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div>
                <h2 className="text-label-md text-surface/80">{t("link.title")}</h2>
                <p className="mt-1 text-title-h5 md:text-title-h4">{t("link.pitch")}</p>
              </div>
              <LinkActions link={link} />
              <p className="text-p-sm text-surface/80">{t("link.hint")}</p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <ZoomableQr link={link} />
              <p className="text-p-xs text-surface/80">{t("link.qrHint")}</p>
            </div>
          </section>
        )}

        <Panel
          as="section"
          className={`flex flex-col gap-5 ${overview.salesPartner ? "xl:col-span-4" : "xl:col-span-5"}`}
        >
          <div>
            <h2 className="text-label-md text-muted">{t("amounts.owed")}</h2>
            <p className="mt-1 text-title-h3">{money(overview.owedAmount)}</p>
            <p className="mt-1 text-p-sm text-muted">{t("amounts.owedHint")}</p>
          </div>
          <dl className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-subtle px-4 py-3">
              <dt className="min-w-0">
                <span className="block text-label-sm">{t("amounts.pending")}</span>
                <span className="block text-p-xs text-muted">{t("amounts.pendingHint")}</span>
              </dt>
              <dd className="shrink-0 text-label-md">{money(overview.pendingAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-subtle px-4 py-3">
              <dt className="text-label-sm">{t("amounts.paid")}</dt>
              <dd className="shrink-0 text-label-md">{money(overview.paidAmount)}</dd>
            </div>
          </dl>
        </Panel>

        {nothingYet ? (
          // A former sales partner has no link to share any more.
          <Panel as="section" className={`flex flex-col ${overview.salesPartner ? "xl:col-span-8" : "xl:col-span-7"}`}>
            {overview.salesPartner ? (
              <EmptyState illustration="carrying" title={t("welcome.title")} description={t("welcome.description")} />
            ) : (
              <EmptyState
                illustration="box"
                title={t("formerEmpty.title")}
                description={t("formerEmpty.description")}
              />
            )}
          </Panel>
        ) : (
          <>
            <Panel
              as="section"
              padding="none"
              className={`flex flex-col ${overview.salesPartner ? "xl:col-span-5" : "xl:col-span-7"}`}
            >
              <h2 className="px-5 pt-5 pb-3 text-title-h6 lg:px-6 lg:pt-6">
                {t("shops.title", { count: overview.businesses.length })}
              </h2>
              {overview.businesses.length === 0 ? (
                <EmptyState
                  illustration="carrying"
                  title={t("shops.empty.title")}
                  description={t("shops.empty.description")}
                />
              ) : (
                <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto px-2 pb-3 lg:px-3">
                  {overview.businesses.map((business, index) => {
                    // Removing the status stops commissions on every shop (ADR 0040).
                    const earning =
                      overview.salesPartner && business.commissionsEndAt && new Date(business.commissionsEndAt) > now;
                    return (
                      <li
                        key={`${business.name}-${index}`}
                        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl px-3 py-2"
                      >
                        <span title={business.name} className="min-w-0 truncate text-label-md">
                          {business.name}
                        </span>
                        <span
                          className={`inline-flex h-7 shrink-0 items-center rounded-full px-3 text-label-xs font-semibold ${
                            !business.commissionsEndAt
                              ? "bg-subtle text-ink"
                              : earning
                                ? "bg-brand text-ink"
                                : "bg-pine-subtle text-pine"
                          }`}
                        >
                          {!business.commissionsEndAt
                            ? t("shops.notPaying")
                            : earning
                              ? t("shops.earningUntil", { date: formatDate(business.commissionsEndAt, locale) })
                              : overview.salesPartner
                                ? t("shops.ended", { date: formatDate(business.commissionsEndAt, locale) })
                                : t("shops.stopped")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel
              as="section"
              className={`flex flex-col gap-4 ${overview.salesPartner ? "xl:col-span-7" : "xl:col-span-12"}`}
            >
              <h2 className="text-title-h6">{t("earnings.title")}</h2>
              {overview.monthlyTotals.length === 0 ? (
                <p className="py-10 text-center text-p-sm text-muted">{t("earnings.empty")}</p>
              ) : (
                <EarningsChart totals={overview.monthlyTotals} locale={locale} />
              )}
            </Panel>

            <Panel as="section" padding="none" className="flex flex-col overflow-clip xl:col-span-8">
              <h2 className="px-5 pt-5 pb-3 text-title-h6 lg:px-7 lg:pt-6">{t("commissions.title")}</h2>
              {list.items.length === 0 ? (
                <EmptyState
                  illustration="trophy"
                  title={t("commissions.empty.title")}
                  description={t("commissions.empty.description")}
                />
              ) : (
                <>
                  <div
                    className={`mx-3 hidden rounded-xl bg-subtle px-4 py-2.5 text-label-xs text-muted lg:grid ${GRID}`}
                  >
                    <span>{t("commissions.shop")}</span>
                    <span>{t("commissions.invoicePaid")}</span>
                    <span className="text-right">{t("commissions.amount")}</span>
                    <span className="text-right">{t("commissions.state")}</span>
                  </div>
                  <ul className="flex flex-col gap-1 p-2 lg:p-3">
                    {list.items.map((commission) => (
                      <li
                        key={commission.id}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-2xl px-3 py-3 lg:min-h-16 lg:px-4 lg:py-2 ${GRID}`}
                      >
                        <span className="min-w-0">
                          <span title={commission.business.name} className="block truncate text-label-md">
                            {commission.business.name}
                          </span>
                          <span className="block text-p-xs text-muted lg:hidden">
                            {formatDate(commission.invoicePaidAt, locale)}
                          </span>
                        </span>
                        <span className="hidden text-p-sm lg:block">
                          {formatDate(commission.invoicePaidAt, locale)}
                        </span>
                        <span className="text-right text-label-md">{money(commission.amount)}</span>
                        <span className="col-span-2 flex justify-end lg:col-span-1">
                          <span
                            className={`inline-flex h-7 items-center rounded-full px-3 text-label-xs font-semibold ${COMMISSION_PILLS[commission.state]}`}
                          >
                            {commission.paidAt
                              ? t("commissions.paidOn", { date: formatDate(commission.paidAt, locale) })
                              : t(`commissions.states.${commission.state}`)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={list.total}
                    href={pageHref}
                    className="mx-5 mt-auto mb-4 border-t border-border pt-3 lg:mx-7"
                  />
                </>
              )}
            </Panel>
          </>
        )}

        <Panel as="section" className="flex flex-col gap-4 xl:col-span-4">
          <h2 className="text-title-h6">{t("rules.title")}</h2>
          <ol className="flex flex-col gap-3">
            {(["share", "earn", "wait", "paid"] as const).map((rule, index) => (
              <li key={rule} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pine text-label-xs font-semibold text-brand">
                  {index + 1}
                </span>
                <span className="text-p-sm">{t(`rules.${rule}`)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
