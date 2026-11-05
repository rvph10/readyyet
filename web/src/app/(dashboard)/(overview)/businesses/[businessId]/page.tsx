import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/coming-soon";
import { buttonClass } from "@/components/ui/button";
import { getMe } from "@/lib/me";
import { ownedBusiness } from "@/lib/memberships";

export default async function BusinessPage({ params }: PageProps<"/businesses/[businessId]">) {
  const [{ businessId }, { memberships }, t] = await Promise.all([params, getMe(), getTranslations("dashboard")]);
  const business = ownedBusiness(memberships, businessId);
  if (!business) {
    notFound();
  }
  return (
    <ComingSoon title={business.name}>
      <Link href={`/businesses/${business.id}/locations/new`} className={buttonClass({ variant: "secondary" })}>
        {t("addLocation")}
      </Link>
    </ComingSoon>
  );
}
