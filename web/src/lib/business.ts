import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { api } from "./api/client";
import { pageData } from "./api/errors";
import { requestOrigin } from "./request-origin";

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

// The sign-in page, which carries the code on to the new Business (ADR 0135).
export async function referralLink(referralCode: string) {
  return `${await requestOrigin()}/sign-in?ref=${referralCode}`;
}
