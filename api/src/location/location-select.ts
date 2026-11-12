import type { Prisma } from "@readyyet/db";
import { publicImageUrl } from "../storage/image";
import { type OpeningHoursSpecification, toPostalAddress } from "./location-info";

// A Location as returned by the API: its business type by code, like the
// catalogue, and no deletedAt, a deleted Location is never returned.
export const locationSelect = {
  select: {
    id: true,
    businessId: true,
    name: true,
    businessTypeDetail: true,
    contactPhone: true,
    contactEmail: true,
    locale: true,
    timeZone: true,
    streetAddress: true,
    postalCode: true,
    addressLocality: true,
    addressCountry: true,
    openingHours: true,
    turnaroundDays: true,
    googleReviewUrl: true,
    feedbackEmailsSince: true,
    createdAt: true,
    updatedAt: true,
    businessType: { select: { code: true } },
    business: { select: { logoKey: true } },
  },
} as const;

export function toLocationResponse({
  businessType,
  streetAddress,
  postalCode,
  addressLocality,
  addressCountry,
  openingHours,
  business,
  feedbackEmailsSince,
  ...location
}: Prisma.LocationGetPayload<typeof locationSelect>) {
  return {
    ...location,
    feedbackEmails: feedbackEmailsSince !== null,
    businessTypeCode: businessType.code,
    // The Business's, the same for all its Locations (ADR 0051).
    logoUrl: publicImageUrl(business.logoKey),
    address: toPostalAddress({ streetAddress, postalCode, addressLocality, addressCountry }),
    openingHours: openingHours as OpeningHoursSpecification[],
  };
}
