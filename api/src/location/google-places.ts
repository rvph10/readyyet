import { DAYS_OF_WEEK, type OpeningHoursSpecification, type PostalAddress, toOpeningHoursJson } from "./location-info";

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const MOST_PLACES = 5;
const TIMEOUT_MS = 5000;
// Only what's shown or offered: each field decides what Google bills.
const FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "regularOpeningHours",
  "rating",
  "userRatingCount",
].map((field) => `places.${field}`);
// Where the number comes before the street, as people there write it.
const NUMBER_FIRST = new Set(["FR", "LU", "GB", "IE", "US", "CA", "AU"]);
const MOST_RANGES_A_DAY = 2;

interface GoogleComponent {
  longText: string;
  shortText: string;
  types: string[];
}

interface GooglePoint {
  day: number;
  hour: number;
  minute: number;
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: GoogleComponent[];
  regularOpeningHours?: { periods?: { open: GooglePoint; close?: GooglePoint }[] };
  rating?: number;
  userRatingCount?: number;
}

export interface FoundPlace {
  placeId: string;
  name: string;
  // Null for a shop with no public address on Google.
  formattedAddress: string | null;
  rating: number | null;
  ratingCount: number | null;
  // Opens Google's review form for this place (ADR 0039 accepts its shape).
  reviewUrl: string;
  address: PostalAddress | null;
  openingHours: OpeningHoursSpecification[];
}

// ADR 0126: Google Text Search (New) with ReadyYet's own key, no OAuth.
export async function searchGooglePlaces(
  query: string,
  { languageCode, regionCode }: { languageCode: string; regionCode: string },
): Promise<FoundPlace[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set");
  }
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "content-type": "application/json", "x-goog-api-key": key, "x-goog-fieldmask": FIELDS.join(",") },
    // A shop that serves its customers where they are (pickup, home visits)
    // hides its address on Google, and is left out unless asked for.
    body: JSON.stringify({
      textQuery: query,
      languageCode,
      regionCode,
      pageSize: MOST_PLACES,
      includePureServiceAreaBusinesses: true,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google Places answered ${response.status}: ${await response.text()}`);
  }
  const { places = [] } = (await response.json()) as { places?: GooglePlace[] };
  return places.map((place) => ({
    placeId: place.id,
    name: place.displayName?.text ?? "",
    formattedAddress: place.formattedAddress ?? null,
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? null,
    reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(place.id)}`,
    address: toAddress(place.addressComponents ?? []),
    openingHours: toOpeningHours(place.regularOpeningHours?.periods ?? []),
  }));
}

// ADR 0034's four parts, or nothing: half an address isn't offered.
function toAddress(components: GoogleComponent[]): PostalAddress | null {
  const part = (type: string) => components.find(({ types }) => types.includes(type));
  const number = part("street_number")?.longText;
  const route = part("route")?.longText;
  const postalCode = part("postal_code")?.longText;
  const locality = (part("locality") ?? part("postal_town"))?.longText;
  const country = part("country")?.shortText;
  if (!route || !postalCode || !locality || !country) {
    return null;
  }
  const streetAddress = !number ? route : NUMBER_FIRST.has(country) ? `${number} ${route}` : `${route} ${number}`;
  return { streetAddress, postalCode, addressLocality: locality, addressCountry: country };
}

const time = ({ hour, minute }: GooglePoint) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

// Ranges that open and close the same day, at most two a day. A place open
// around the clock or past midnight isn't offered any hours at all, rather
// than hours that are wrong.
function toOpeningHours(periods: { open: GooglePoint; close?: GooglePoint }[]): OpeningHoursSpecification[] {
  if (periods.some(({ open, close }) => !close || close.day !== open.day)) {
    return [];
  }
  // Google counts from Sunday, DAYS_OF_WEEK from Monday.
  const ranges = periods.map(({ open, close }) => ({
    dayOfWeek: DAYS_OF_WEEK[(open.day + 6) % 7],
    opens: time(open),
    closes: time(close!),
  }));
  const tooMany = DAYS_OF_WEEK.some(
    (day) => ranges.filter(({ dayOfWeek }) => dayOfWeek === day).length > MOST_RANGES_A_DAY,
  );
  return tooMany ? [] : toOpeningHoursJson(ranges);
}
