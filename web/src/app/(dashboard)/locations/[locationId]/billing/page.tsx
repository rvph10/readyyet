import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getMe } from "@/lib/me";
import { getBilling, getDaysToChoosePlan, getLocation } from "../location-data";
import { PageHeader } from "../page-header";
import { isManager } from "../sections";
import { parsePlan } from "../plan-prices";
import { intlLocale } from "../tickets/ticket-views";
import { BillingBoard } from "./billing-board";

export default async function BillingPage({ params, searchParams }: PageProps<"/locations/[locationId]/billing">) {
  const [{ locationId }, search, { memberships }, t, locale] = await Promise.all([
    params,
    searchParams,
    getMe(),
    getTranslations("dashboard"),
    getLocale(),
  ]);
  const membership = memberships.find(({ location }) => location.id === locationId);
  if (!membership || !isManager(membership.role)) {
    notFound();
  }
  // Stripe's return comes before its webhook, so this page could still say
  // there's no plan. Today thanks them without saying anything about the plan.
  if (search.checkout === "success") {
    const kept = search.trial === "kept" ? "&trial=kept" : "";
    redirect(`/locations/${locationId}?checkout=success&plan=${parsePlan(search.plan) ?? ""}${kept}`);
  }
  const [billing, daysLeft, { timeZone }] = await Promise.all([
    getBilling(locationId),
    getDaysToChoosePlan(locationId, membership.role),
    getLocation(locationId),
  ]);
  const day = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone });
  return (
    <>
      <PageHeader title={t("sections.billing")} />
      <BillingBoard
        locationId={locationId}
        businessId={membership.location.business.id}
        owner={membership.role === "OWNER"}
        billing={billing}
        daysLeft={daysLeft}
        trialEnd={billing.trialEndsAt && day.format(new Date(billing.trialEndsAt))}
        periodEnd={billing.currentPeriodEnd && day.format(new Date(billing.currentPeriodEnd))}
      />
    </>
  );
}
