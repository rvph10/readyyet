import "server-only";
import * as Sentry from "@sentry/nextjs";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";

// Read by the layout and the page under it, called once per request.
export const getLocation = cache(async (locationId: string) =>
  pageData(await (await api()).GET("/locations/{locationId}", { params: { path: { locationId } } })),
);

export const getOverview = cache(async (locationId: string) =>
  pageData(await (await api()).GET("/locations/{locationId}/tickets/overview", { params: { path: { locationId } } })),
);

export const getBilling = cache(async (locationId: string) =>
  pageData(await (await api()).GET("/locations/{locationId}/billing", { params: { path: { locationId } } })),
);

const FEEDBACK_ON_THE_BELL = 5;

// The layout reads this on every page, for a preview the bell can do without: its
// count comes from the overview, and it still links to Feedback. So a failure is
// reported, not shown as the whole shop's error page.
export async function getLatestFeedback(locationId: string) {
  try {
    const { items } = await pageData(
      await (
        await api()
      ).GET("/locations/{locationId}/feedback", {
        params: { path: { locationId }, query: { handled: "false", take: FEEDBACK_ON_THE_BELL } },
      }),
    );
    return items;
  } catch (error) {
    unstable_rethrow(error);
    Sentry.captureException(error);
    return [];
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

// A plan still to choose: the trial's days left, 0 once frozen, null when paid
// or when this Role can't choose one.
export const getDaysToChoosePlan = cache(async (locationId: string, role: string) => {
  if (role === "EMPLOYEE") return null;
  const billing = await getBilling(locationId);
  if (billing.frozen) return 0;
  if (billing.status !== "TRIAL" || !billing.trialEndsAt) return null;
  return Math.max(1, Math.ceil((new Date(billing.trialEndsAt).getTime() - Date.now()) / DAY_MS));
});
