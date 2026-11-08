import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { AddPartner } from "./add-partner";
import { AdminHeader } from "./admin-header";
import { formatCents, formatDate, partnerHref } from "./admin-views";

const GRID = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] lg:gap-x-5";

// ADR 0119: who brings shops in, and what's owed to whom. A former sales
// partner is listed while still owed (ADR 0040).
export default async function SalesPartnersPage() {
  const [client, t, locale] = await Promise.all([api(), getTranslations("admin"), getLocale()]);
  const partners = await client.GET("/admin/sales-partners").then(pageData);
  const money = (cents: number) => formatCents(cents, locale);
  const toPay = partners.filter(({ owedAmount }) => owedAmount > 0);
  const owedTotal = toPay.reduce((sum, { owedAmount }) => sum + owedAmount, 0);
  const pendingTotal = partners.reduce((sum, { pendingAmount }) => sum + pendingAmount, 0);

  return (
    <>
      <AdminHeader title={t("nav.salesPartners")} subtitle={t("partners.subtitle")}>
        {partners.length > 0 && <AddPartner />}
      </AdminHeader>
      {partners.length === 0 ? (
        <Panel className="flex flex-1 flex-col">
          <EmptyState
            illustration="helping"
            title={t("partners.empty.title")}
            description={t("partners.empty.description")}
            action={<AddPartner />}
          />
        </Panel>
      ) : (
        <div className="grid flex-1 grid-cols-1 items-start gap-4 lg:gap-5 xl:grid-cols-12">
          <Panel as="section" padding="none" className="overflow-clip xl:col-span-8">
            <h2 className="px-5 pt-5 pb-4 text-title-h6 lg:px-7 lg:pt-6">
              {t("partners.count", { count: partners.length })}
            </h2>
            <div className={`mx-3 hidden rounded-xl bg-subtle px-4 py-2.5 text-label-xs text-muted lg:grid ${GRID}`}>
              <span>{t("partners.partner")}</span>
              <span>{t("partners.since")}</span>
              <span className="text-right">{t("states.PENDING")}</span>
              <span className="text-right">{t("states.OWED")}</span>
            </div>
            <ul className="flex flex-col gap-1 p-2 lg:p-3">
              {partners.map((partner) => (
                <li key={partner.id}>
                  <Link
                    href={partnerHref(partner.id)}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-3 transition-colors hover:bg-subtle lg:min-h-18 lg:px-4 lg:py-2 ${GRID}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar id={partner.id} name={partner.name} src={null} className="lg:size-12! lg:text-base!" />
                      <span className="min-w-0">
                        <span title={partner.name} className="block truncate text-label-md">
                          {partner.name}
                        </span>
                        <span title={partner.email} className="block truncate text-p-xs text-muted">
                          {partner.email}
                        </span>
                      </span>
                    </span>
                    <span className="hidden text-p-sm lg:block">
                      {partner.salesPartnerSince ? (
                        formatDate(partner.salesPartnerSince, locale)
                      ) : (
                        <span className="inline-flex h-7 items-center rounded-full bg-warning-subtle px-3 text-label-xs font-semibold">
                          {t("partners.former")}
                        </span>
                      )}
                    </span>
                    <span className="hidden text-right text-label-sm lg:block">{money(partner.pendingAmount)}</span>
                    <span className="text-right">
                      {partner.owedAmount > 0 ? (
                        <span className="inline-flex h-8 items-center rounded-full bg-brand px-3.5 text-label-sm font-semibold">
                          {money(partner.owedAmount)}
                        </span>
                      ) : (
                        <span className="text-p-sm text-muted">{t("partners.nothingOwed")}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <section className="flex flex-col gap-5 rounded-sheet bg-pine p-6 text-surface max-xl:order-first lg:p-7 xl:col-span-4">
            <div>
              <h2 className="text-label-md text-surface/80">{t("toPay.title")}</h2>
              <p className="mt-1 text-title-h3 text-brand">{money(owedTotal)}</p>
              <p className="mt-1 text-p-sm text-surface/80">
                {toPay.length > 0
                  ? t("toPay.across", { count: toPay.length })
                  : t("toPay.nothing", { pending: money(pendingTotal) })}
              </p>
            </div>
            {toPay.length > 0 && (
              <ul className="-mx-1 flex max-h-96 flex-col gap-1 overflow-y-auto px-1">
                {toPay.map((partner) => (
                  <li key={partner.id}>
                    <Link
                      href={partnerHref(partner.id)}
                      className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface/10 px-3 py-2 transition-colors hover:bg-surface/20"
                    >
                      <span className="min-w-0 flex-1 truncate text-label-sm">{partner.name}</span>
                      <span className="shrink-0 text-label-sm font-semibold">{money(partner.owedAmount)}</span>
                      <Icon name="arrow-right" className="size-2.5 shrink-0 text-brand" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-p-xs text-surface/70">{t("toPay.rule")}</p>
          </section>
        </div>
      )}
    </>
  );
}
