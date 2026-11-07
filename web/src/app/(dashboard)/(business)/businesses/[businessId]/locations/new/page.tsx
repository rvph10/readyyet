import { getTranslations } from "next-intl/server";
import type { Country } from "react-phone-number-input";
import { getBusinessTypeOptions } from "@/app/(create-business)/businesses/new/business-types";
import { getLocation } from "@/app/(dashboard)/locations/[locationId]/location-data";
import { getOwnedBusiness } from "@/lib/business";
import { getMe } from "@/lib/me";
import { BusinessHeader } from "../../business-header";
import { NewLocationForm } from "./new-location-form";

export default async function NewLocationPage({ params }: PageProps<"/businesses/[businessId]/locations/new">) {
  const { businessId } = await params;
  const [business, me, businessTypes, t, tBusiness] = await Promise.all([
    getOwnedBusiness(businessId),
    getMe(),
    getBusinessTypeOptions(),
    getTranslations("dashboard"),
    getTranslations("business.newLocation"),
  ]);
  // A second shop is most likely in the same country as the first.
  const [first] = business.locations;
  const country = first && (await getLocation(first.id)).address?.addressCountry;
  return (
    <>
      <BusinessHeader title={t("addLocation")} subtitle={tBusiness("subtitle", { business: business.name })} />
      <NewLocationForm
        business={business}
        businessTypes={businessTypes}
        email={me.email}
        country={country as Country | undefined}
      />
    </>
  );
}
