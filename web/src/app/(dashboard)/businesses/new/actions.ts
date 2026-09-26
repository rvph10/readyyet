"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult, type ActionResult } from "@/lib/api/errors";

export async function createBusiness(_previous: ActionResult | null, form: FormData): Promise<ActionResult> {
  // Every input of the form is text, so each value is a string.
  const field = (name: string) => form.get(name) as string;
  const result = await (
    await api()
  ).POST("/businesses", {
    body: {
      name: field("name"),
      location: {
        name: field("location.name"),
        businessTypeCode: field("location.businessTypeCode"),
        contactPhone: field("location.contactPhone"),
        contactEmail: field("location.contactEmail"),
        locale: field("location.locale") as "EN" | "FR",
        timeZone: field("location.timeZone"),
      },
    },
  });
  if (result.data) {
    redirect(`/locations/${result.data.locations[0].id}`);
  }
  return actionResult(result);
}
