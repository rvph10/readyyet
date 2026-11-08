import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/tabs";
import type { IllustrationName } from "@/components/illustration";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { referralLink } from "@/lib/business";
import { lastPage, parsePage } from "@/lib/pagination";
import { SheetTitle } from "@/components/sheet-title";
import { COMMISSION_PILLS, formatCents, formatDate } from "@/lib/commissions";
import { COMMISSION_VIEWS, parseCommissionView, partnerHref, type CommissionView } from "../../admin-views";
import { MarkPaid, RemovePartner } from "./partner-actions";

const PAGE_SIZE = 20;
// The API's largest page. Far more owed commissions than one sales partner
// earns between two payments, the rest would show once these are paid.
const OWED_AT_ONCE = 100;
const GRID = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-x-5";

const EMPTY: Record<CommissionView, IllustrationName> = {
  OWED: "chill",
  PENDING: "clock",
  PAID: "done",
  VOIDED: "balancing",
};

// ADR 0119: one sales partner's commissions, and paying what's owed.
export default async function SalesPartnerPage({ params, searchParams }: PageProps<"/admin/sales-partners/[userId]">) {
  const [{ userId }, search, client, t, locale] = await Promise.all([
    params,
    searchParams,
    api(),
    getTranslations("admin"),
    getLocale(),
  ]);
  const view = parseCommissionView(search.view);
  const page = parsePage(search.page);
  const commissions = (state: CommissionView, take: number, number: number) =>
    client
      .GET("/admin/commissions", { params: { query: { salesPartnerId: userId, state, take, page: number } } })
      .then(pageData);

  const [partners, list, owed] = await Promise.all([
    client.GET("/admin/sales-partners").then(pageData),
    commissions(view, PAGE_SIZE, page),
    commissions("OWED", OWED_AT_ONCE, 1),
  ]);
  const partner = partners.find(({ id }) => id === userId);
  if (!partner) {
    notFound();
  }
  // Commissions were paid, and this page is now past the last one.
  if (page > 1 && list.items.length === 0) {
    redirect(partnerHref(userId, { view, page: lastPage(list.total, PAGE_SIZE) }));
  }

  const money = (cents: number) => formatCents(cents, locale);
  const owedAmount = owed.items.reduce((sum, { amount }) => sum + amount, 0);
  const link = await referralLink(partner.referralCode);

  return (
    <>
      <SheetTitle
        title={partner.name}
        subtitle={
          partner.salesPartnerSince
            ? t("partner.since", { email: partner.email, date: formatDate(partner.salesPartnerSince, locale) })
            : t("partner.former", { email: partner.email })
        }
        crumbs={[{ label: t("nav.salesPartners"), href: "/admin" }, { label: partner.name }]}
      />
      <div className="grid flex-1 grid-cols-1 items-start gap-4 lg:gap-5 xl:grid-cols-12">
        <Panel as="section" padding="none" className="flex flex-col overflow-clip xl:col-span-8">
          <div className="px-5 pt-5 pb-3 lg:px-7 lg:pt-6">
            <h2 className="sr-only">{t("partner.commissions")}</h2>
            <Tabs
              label={t("partner.commissions")}
              scroll={false}
              tabs={COMMISSION_VIEWS.map((name) => ({
                href: partnerHref(userId, { view: name }),
                label: t(`states.${name}`),
                current: name === view,
                count: name === "OWED" && owed.total > 0 ? owed.total : undefined,
              }))}
            />
          </div>
          {list.items.length === 0 ? (
            <EmptyState
              illustration={EMPTY[view]}
              title={t(`partner.empty.${view}.title`)}
              description={t(`partner.empty.${view}.description`)}
            />
          ) : (
            <>
              <div className={`mx-3 hidden rounded-xl bg-subtle px-4 py-2.5 text-label-xs text-muted lg:grid ${GRID}`}>
                <span>{t("partner.shop")}</span>
                <span>{t("partner.invoicePaid")}</span>
                <span className="text-right">{t("partner.amount")}</span>
                <span className="text-right">{t("partner.state")}</span>
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
                    <span className="hidden text-p-sm lg:block">{formatDate(commission.invoicePaidAt, locale)}</span>
                    <span className="text-right text-label-md">{money(commission.amount)}</span>
                    <span className="col-span-2 flex justify-end lg:col-span-1">
                      <span
                        className={`inline-flex h-7 items-center rounded-full px-3 text-label-xs font-semibold ${COMMISSION_PILLS[commission.state]}`}
                      >
                        {commission.paidAt
                          ? t("partner.paidOn", { date: formatDate(commission.paidAt, locale) })
                          : t(`states.${commission.state}`)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={list.total}
                href={(number) => partnerHref(userId, { view, page: number })}
                className="mx-5 mt-auto mb-4 border-t border-border pt-3 lg:mx-7"
              />
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-4 max-xl:order-first lg:gap-5 xl:col-span-4">
          <section className="flex flex-col gap-5 rounded-sheet bg-pine p-6 text-surface lg:p-7">
            <div>
              <h2 className="text-label-md text-surface/80">{t("partner.owedNow")}</h2>
              <p className="mt-1 text-title-h3 text-brand">{money(owedAmount)}</p>
              <p className="mt-1 text-p-sm text-surface/80">
                {t("partner.pending", { amount: money(partner.pendingAmount) })}
              </p>
            </div>
            {owed.items.length > 0 && (
              <MarkPaid ids={owed.items.map(({ id }) => id)} amount={money(owedAmount)} name={partner.name} />
            )}
          </section>
          <Panel as="section" className="flex flex-col gap-4">
            <h2 className="text-title-h6">{t("partner.link")}</h2>
            <CopyButton
              value={link}
              label={t("partner.copyLink")}
              copiedLabel={t("partner.linkCopied")}
              variant="secondary"
              className="w-full"
            />
            <p className="text-p-sm text-muted">{t("partner.linkHint")}</p>
            {partner.salesPartnerSince && (
              <div className="border-t border-border pt-4">
                <RemovePartner userId={partner.id} name={partner.name} />
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
