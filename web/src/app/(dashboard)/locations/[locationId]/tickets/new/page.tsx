import { calendarDateIn, turnaroundReadyDate } from "@readyyet/shared";
import { getTranslations } from "next-intl/server";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { TicketForm } from "./ticket-form";

export default async function NewTicketPage({ params }: PageProps<"/locations/[locationId]/tickets/new">) {
  const [{ locationId }, t, client] = await Promise.all([params, getTranslations("tickets"), api()]);
  const location = await pageData(await client.GET("/locations/{locationId}", { params: { path: { locationId } } }));
  const now = new Date();

  return (
    <>
      <h1 className="font-display text-label-xl md:text-title-h4">{t("new")}</h1>
      <TicketForm
        locationId={locationId}
        today={calendarDateIn(now, location.timeZone)}
        suggestedDate={
          location.turnaroundDays
            ? turnaroundReadyDate({
                droppedOffAt: now,
                turnaroundDays: location.turnaroundDays,
                timeZone: location.timeZone,
                openingHours: location.openingHours,
              })
            : ""
        }
        locationLocale={location.locale}
        country={location.address?.addressCountry}
      />
    </>
  );
}
