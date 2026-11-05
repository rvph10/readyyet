import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ComingSoon } from "@/components/coming-soon";
import { buttonClass } from "@/components/ui/button";
import { getOwnedBusiness } from "@/lib/business";

export default async function BusinessPage({ params }: PageProps<"/businesses/[businessId]">) {
  const [{ businessId }, t] = await Promise.all([params, getTranslations("dashboard")]);
  const business = await getOwnedBusiness(businessId);
  return (
    <ComingSoon title={business.name}>
      <Link href={`/businesses/${business.id}/locations/new`} className={buttonClass({ variant: "secondary" })}>
        {t("addLocation")}
      </Link>
    </ComingSoon>
  );
}
