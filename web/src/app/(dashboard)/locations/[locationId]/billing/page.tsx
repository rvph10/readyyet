import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getMe } from "@/lib/me";
import { getBilling, getDaysToChoosePlan, getLocation } from "../location-data";
import { PageHeader } from "../page-header";
import { isManager } from "../sections";
import { parsePlan } from "../plan-prices";
import { intlLocale } from "../tickets/ticket-views";
import { BillingBoard } from "./billing-board";
import { BillingLoading } from "./billing-loading";
import { Reveal } from "@/components/reveal";

// ADR 0091. ADR 0119: the header stands at once, the plan waits in its tiles.
export default async function BillingPage({ params, searchParams }: PageProps<"/locations/[locationId]/billing">) {
  const [{ locationId }, search, { memberships }, t] = await Promise.all([
    params,
    searchParams,
    getMe(),
    getTranslations("dashboard"),
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
  return (
    <>
      <PageHeader title={t("sections.billing")} />
      <Reveal fallback={<BillingLoading />}>
        <BillingContent locationId={locationId} role={membership.role} businessId={membership.location.business.id} />
      </Reveal>
    </>
  );
}

async function BillingContent({
  locationId,
  role,
  businessId,
}: {
  locationId: string;
  role: string;
  businessId: string;
}) {
  const [billing, daysLeft, { timeZone }, locale] = await Promise.all([
    getBilling(locationId),
    getDaysToChoosePlan(locationId, role),
    getLocation(locationId),
    getLocale(),
  ]);
  const day = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone });
  return (
    <BillingBoard
      locationId={locationId}
      businessId={businessId}
      owner={role === "OWNER"}
      billing={billing}
      daysLeft={daysLeft}
      trialEnd={billing.trialEndsAt && day.format(new Date(billing.trialEndsAt))}
      periodEnd={billing.currentPeriodEnd && day.format(new Date(billing.currentPeriodEnd))}
    />
  );
}
