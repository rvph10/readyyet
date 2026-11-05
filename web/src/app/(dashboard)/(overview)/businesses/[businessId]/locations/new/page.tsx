import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/coming-soon";
import { getMe } from "@/lib/me";
import { ownedBusiness } from "@/lib/memberships";

export default async function NewLocationPage({ params }: PageProps<"/businesses/[businessId]/locations/new">) {
  const [{ businessId }, { memberships }, t] = await Promise.all([params, getMe(), getTranslations("dashboard")]);
  if (!ownedBusiness(memberships, businessId)) {
    notFound();
  }
  return <ComingSoon title={t("addLocation")} />;
}
