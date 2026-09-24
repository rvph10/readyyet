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
    createdAt: true,
    updatedAt: true,
    businessType: { select: { code: true } },
  },
} as const;

export function toLocationResponse<T extends { businessType: { code: string } }>({ businessType, ...location }: T) {
  return { ...location, businessTypeCode: businessType.code };
}
