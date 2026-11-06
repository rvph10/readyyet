import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ComingSoon } from "@/components/coming-soon";
import { getMe } from "@/lib/me";
import { PageHeader } from "../page-header";
import { ChoosePlanButton } from "../overview/choose-plan-button";
import { isManager } from "../sections";

// Where Stripe's Checkout sends someone back to. The Billing page itself isn't
// built yet, so a finished checkout lands on Today, which thanks them.
export default async function BillingPage({ params, searchParams }: PageProps<"/locations/[locationId]/billing">) {
  const [{ locationId }, search, { memberships }, t] = await Promise.all([
    params,
    searchParams,
    getMe(),
    getTranslations("dashboard"),
  ]);
  const role = memberships.find(({ location }) => location.id === locationId)?.role;
  if (!role || !isManager(role)) {
    notFound();
  }
  if (search.checkout === "success") {
    redirect(`/locations/${locationId}?checkout=success`);
  }
  return (
    <>
      <PageHeader locationId={locationId} title={t("sections.billing")} />
      <ComingSoon>
        <ChoosePlanButton />
      </ComingSoon>
    </>
  );
}
