import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { api } from "./api/client";
import { pageData } from "./api/errors";

// Asks the API rather than reading /me's Memberships: an Owner whose Locations
// are all deleted has none, and still owns the Business. A stranger gets the
// same not-found as for a Business that doesn't exist.
export const getOwnedBusiness = cache(async (businessId: string) => {
  const result = await (await api()).GET("/businesses/{businessId}", { params: { path: { businessId } } });
  if (result.response.status === 403) {
    notFound();
  }
  return pageData(result);
});

// The app itself, as ?ref= is kept by its proxy (ADR 0047). Read from the
// request, as the web app has no setting for its own address.
export async function referralLink(referralCode: string) {
  const request = await headers();
  return `${request.get("x-forwarded-proto") ?? "http"}://${request.get("host")}/sign-in?ref=${referralCode}`;
}
