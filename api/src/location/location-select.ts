import type { Prisma } from "@readyyet/db";
import { type OpeningHoursSpecification, toPostalAddress } from "./location-info";

// A Location as returned by the API: its business type by code, like the
// catalogue, and no deletedAt, a deleted Location is never returned.
export const locationSelect = {
  select: {
    id: true,
    businessId: true,
    name: true,
    contactPhone: true,
    contactEmail: true,
    logoUrl: true,
    locale: true,
    timeZone: true,
    streetAddress: true,
    postalCode: true,
    addressLocality: true,
    addressCountry: true,
    openingHours: true,
    createdAt: true,
    updatedAt: true,
    businessType: { select: { code: true } },
  },
} as const;

export function toLocationResponse({
  businessType,
  streetAddress,
  postalCode,
  addressLocality,
  addressCountry,
  openingHours,
  ...location
}: Prisma.LocationGetPayload<typeof locationSelect>) {
  return {
    ...location,
    businessTypeCode: businessType.code,
    address: toPostalAddress({ streetAddress, postalCode, addressLocality, addressCountry }),
    openingHours: openingHours as OpeningHoursSpecification[],
  };
}
