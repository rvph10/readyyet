import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getOwnedBusiness } from "@/lib/business";
import { BusinessHeader } from "../business-header";
import { BusinessSettings, Ownership } from "./business-settings";

// ADR 0106: what's used, on one sheet. ADR 0119: the sheet stands at once, the
// transfer waits for the shops' Admins.
export default async function BusinessSettingsPage({ params }: PageProps<"/businesses/[businessId]/settings">) {
  const { businessId } = await params;
  const [business, t] = await Promise.all([getOwnedBusiness(businessId), getTranslations("dashboard")]);
  return (
    <>
      <BusinessHeader title={t("sections.settings")} />
      <BusinessSettings
        business={business}
        ownership={
          <Suspense>
            <Transfer businessId={businessId} />
          </Suspense>
        }
      />
    </>
  );
}

// Only an Admin of one of its Locations can take a Business over (ADR 0017),
// and someone can be Admin at several.
async function Transfer({ businessId }: { businessId: string }) {
  const [business, client] = await Promise.all([getOwnedBusiness(businessId), api()]);
  const teams = await Promise.all(
    business.locations.map(({ id }) =>
      client.GET("/locations/{locationId}/memberships", { params: { path: { locationId: id } } }).then(pageData),
    ),
  );
  const admins = new Map(
    teams.flat().flatMap(({ role, user }) => (role === "ADMIN" ? [[user.id, user] as const] : [])),
  );
  return admins.size > 0 ? <Ownership business={business} admins={[...admins.values()]} /> : null;
}
