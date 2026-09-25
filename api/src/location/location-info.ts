import { buildMessage, ValidateBy } from "class-validator";

// schema.org's DayOfWeek names, the order a week is shown in.
export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// Types, not interfaces: Prisma only takes a value with an index
// signature as Json.
export type OpeningHoursSpecification = {
  dayOfWeek: DayOfWeek;
  opens: string;
  closes: string;
};

export type PostalAddress = {
  streetAddress: string;
  postalCode: string;
  addressLocality: string;
  addressCountry: string;
};

export type AddressColumns = { [K in keyof PostalAddress]: string | null };

// The columns are all set or all null (location_address_complete).
// Picks the four fields: it's handed whole Location rows, whose other
// columns must not reach the tracking page.
export function toPostalAddress({
  streetAddress,
  postalCode,
  addressLocality,
  addressCountry,
}: AddressColumns): PostalAddress | null {
  return streetAddress === null
    ? null
    : ({ streetAddress, postalCode, addressLocality, addressCountry } as PostalAddress);
}

export function toAddressColumns(address: PostalAddress | null): AddressColumns {
  const { streetAddress, postalCode, addressLocality, addressCountry } = address ?? {
    streetAddress: null,
    postalCode: null,
    addressLocality: null,
    addressCountry: null,
  };
  return { streetAddress, postalCode, addressLocality, addressCountry };
}

// The regions Intl knows, which leaves out UTC, Etc/GMT+1 and offsets like
// +01:00: a Location's times must be shown as "Central European Time",
// following its daylight saving changes, never as a fixed UTC offset.
const REGION_TIME_ZONES = new Set(Intl.supportedValuesOf("timeZone"));

// Intl's own spelling of a zone ("europe/brussels" and the "US/Eastern"
// alias both resolve), or undefined when it isn't one.
export function canonicalTimeZone(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function IsRegionTimeZone() {
  return ValidateBy({
    name: "isRegionTimeZone",
    validator: {
      validate: (value) => typeof value === "string" && REGION_TIME_ZONES.has(value),
      defaultMessage: buildMessage(
        (eachPrefix) => `${eachPrefix}$property must be a region's IANA time zone, like Europe/Brussels`,
      ),
    },
  });
}

// At most two ranges a day (a shop closed at lunch), each opening before it
// closes and not overlapping the other. "HH:MM" strings compare in order.
export function IsWeeklyOpeningHours() {
  return ValidateBy({
    name: "isWeeklyOpeningHours",
    validator: {
      validate: (value: OpeningHoursSpecification[]) =>
        Array.isArray(value) &&
        DAYS_OF_WEEK.every((day) => {
          const ranges = value.filter((range) => range?.dayOfWeek === day).sort((a, b) => (a.opens < b.opens ? -1 : 1));
          return (
            ranges.length <= 2 &&
            ranges.every((range, i) => range.opens < range.closes && (i === 0 || ranges[i - 1].closes < range.opens))
          );
        }),
      defaultMessage: buildMessage(
        (eachPrefix) =>
          `${eachPrefix}$property must have at most two ranges a day, each opening before it closes, without overlapping`,
      ),
    },
  });
}

// Google's documented Maps URL for a search: directions in the app the
// Customer already uses, with no API key or script (ADR 0029).
export function mapsUrl(address: PostalAddress): string {
  const query = [
    address.streetAddress,
    `${address.postalCode} ${address.addressLocality}`,
    address.addressCountry,
  ].join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// Stored in the week's order, only the fields that belong to it: the DTO
// instances would otherwise be saved as they arrived.
export function toOpeningHoursJson(hours: OpeningHoursSpecification[]): OpeningHoursSpecification[] {
  return hours
    .map(({ dayOfWeek, opens, closes }) => ({ dayOfWeek, opens, closes }))
    .sort(
      (a, b) => DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek) || (a.opens < b.opens ? -1 : 1),
    );
}
