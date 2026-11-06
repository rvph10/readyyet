import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ComingSoon } from "@/components/coming-soon";
import { getOwnedBusiness } from "@/lib/business";
import { getMe } from "@/lib/me";

// Where Stripe's billing portal sends an Owner back to. The Business has no
// billing page of its own yet, so its first Location's stands in.
export default async function BusinessBillingPage({ params }: PageProps<"/businesses/[businessId]/billing">) {
  const [{ businessId }, { memberships }, t] = await Promise.all([params, getMe(), getTranslations("dashboard")]);
  await getOwnedBusiness(businessId);
  const first = memberships.find(({ location }) => location.business.id === businessId);
  if (first) {
    redirect(`/locations/${first.location.id}/billing`);
  }
  return <ComingSoon title={t("sections.billing")} />;
}
