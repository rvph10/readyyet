import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/coming-soon";
import { getOwnedBusiness } from "@/lib/business";

export default async function NewLocationPage({ params }: PageProps<"/businesses/[businessId]/locations/new">) {
  const [{ businessId }, t] = await Promise.all([params, getTranslations("dashboard")]);
  await getOwnedBusiness(businessId);
  return <ComingSoon title={t("addLocation")} />;
}
