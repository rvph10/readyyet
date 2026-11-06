import { getTranslations } from "next-intl/server";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getOwnedBusiness } from "@/lib/business";
import { BusinessHeader } from "../business-header";
import { BusinessSettings } from "./business-settings";

// ADR 0102: only an Admin of one of its Locations can take a Business over
// (ADR 0017), and someone can be Admin at several.
export default async function BusinessSettingsPage({ params }: PageProps<"/businesses/[businessId]/settings">) {
  const { businessId } = await params;
  const [business, t, client] = await Promise.all([getOwnedBusiness(businessId), getTranslations("dashboard"), api()]);
  const teams = await Promise.all(
    business.locations.map(({ id }) =>
      client.GET("/locations/{locationId}/memberships", { params: { path: { locationId: id } } }).then(pageData),
    ),
  );
  const admins = new Map(
    teams.flat().flatMap(({ role, user }) => (role === "ADMIN" ? [[user.id, user] as const] : [])),
  );
  return (
    <>
      <BusinessHeader title={t("sections.settings")} subtitle={business.name} />
      <div className="flex max-w-5xl flex-col gap-4 lg:gap-5">
        <BusinessSettings business={business} admins={[...admins.values()]} />
      </div>
    </>
  );
}
