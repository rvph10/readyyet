import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/coming-soon";
import { getOwnedBusiness } from "@/lib/business";

// Where Stripe's billing portal sends an Owner back to.
export default async function BusinessBillingPage({ params }: PageProps<"/businesses/[businessId]/billing">) {
  const [{ businessId }, t] = await Promise.all([params, getTranslations("dashboard")]);
  await getOwnedBusiness(businessId);
  return <ComingSoon title={t("sections.billing")} />;
}
