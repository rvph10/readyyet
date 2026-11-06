import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getLocation } from "@/app/(dashboard)/locations/[locationId]/location-data";
import { api } from "@/lib/api/client";
import { greetingKey } from "@/lib/greeting";
import { getMe } from "@/lib/me";
import { groupByBusiness } from "@/lib/memberships";
import { LocationPicker } from "./location-picker";

// ADR 0077: only someone with a choice to make sees this. It asks every time
// rather than reopening the last Location, so a Ticket isn't created in the
// wrong Location by a counter that remembered yesterday.
export default async function ChooseLocationPage() {
  const [me, t, tToday, client] = await Promise.all([
    getMe(),
    getTranslations("dashboard"),
    getTranslations("today"),
    api(),
  ]);
  const { memberships } = me;
  if (memberships.length === 0) {
    redirect("/businesses/new");
  }
  if (memberships.length === 1) {
    redirect(`/locations/${memberships[0].location.id}`);
  }

  // ADR 0092: this page is the way in, so a Location whose numbers fail to
  // load still opens, it only shows without them.
  const [{ timeZone }, ...counts] = await Promise.all([
    getLocation(memberships[0].location.id),
    ...memberships.map(async ({ location }) => {
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
      groups={groupByBusiness(memberships)}
      counts={Object.fromEntries(counts)}
    />
  );
}
