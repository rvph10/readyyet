import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getLocation } from "@/app/(dashboard)/locations/[locationId]/location-data";
import { api } from "@/lib/api/client";
import { greetingKey } from "@/lib/greeting";
import { getMe } from "@/lib/me";
import { chooseBusiness, groupByBusiness } from "@/lib/memberships";
import { LocationPicker } from "./location-picker";

// ADR 0077: only someone with a choice to make sees this. It asks every time
// rather than reopening the last Location, so a Ticket isn't created in the
// wrong Location by a counter that remembered yesterday.
export default async function ChooseLocationPage({ searchParams }: PageProps<"/">) {
  const [search, me, t, tToday, client] = await Promise.all([
    searchParams,
    getMe(),
    getTranslations("dashboard"),
    getTranslations("today"),
    api(),
  ]);
  const { memberships } = me;
  if (memberships.length === 0) {
    // An Owner who deleted their last Location still has their Business, and
    // a sales partner may have no shop of their own (ADR 0120).
    const [owned] = me.ownedBusinessIds;
    redirect(owned ? `/businesses/${owned}` : me.salesPartnerPage ? "/partner" : "/businesses/new");
  }
  if (memberships.length === 1) {
    redirect(`/locations/${memberships[0].location.id}`);
  }

  // ADR 0104: one Business at a time, its Locations are all this page asks about.
  const groups = groupByBusiness(memberships);
  const chosen = chooseBusiness(groups, typeof search.business === "string" ? search.business : null)!;

  // ADR 0105: for an Owner the Business's home is this page, with its plans.
  if (chosen.owned) {
    redirect(`/businesses/${chosen.business.id}`);
  }

  // ADR 0092: this page is the way in, so a Location whose numbers fail to
  // load still opens, it only shows without them.
  const [{ timeZone }, ...counts] = await Promise.all([
    getLocation(chosen.memberships[0].location.id),
    ...chosen.memberships.map(async ({ location }) => {
      const { data } = await client.GET("/locations/{locationId}/tickets/overview", {
        params: { path: { locationId: location.id } },
      });
      return [location.id, data?.counts ?? null] as const;
    }),
  ]);

  return (
    <LocationPicker
      title={tToday(`greeting.${greetingKey(new Date(), timeZone)}`, { name: me.name.split(" ")[0] })}
      subtitle={t("chooseLocation")}
      group={chosen}
      businesses={groups.length > 1 ? groups : []}
      counts={Object.fromEntries(counts)}
    />
  );
}
