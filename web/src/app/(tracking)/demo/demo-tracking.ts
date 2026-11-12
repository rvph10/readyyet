import { calendarDateIn } from "@readyyet/shared";
import type { Tracking } from "../t/[code]/tracking";

export const MOMENTS = ["received", "approval", "repair", "ready"] as const;
export type Moment = (typeof MOMENTS)[number];

const TIME_ZONE = "Europe/Brussels";

// The catalogue's watch Workflow (packages/db/prisma/catalogue.ts), with the
// approval step a Location on Pro would add for its quotes.
const STATUSES = [
  ["RECEIVED", "Received", "Reçu"],
  ["DIAGNOSING", "Diagnosing", "Diagnostic"],
  ["AWAITING_APPROVAL", "Awaiting approval", "En attente d'approbation"],
  ["REPAIRING", "Repairing", "Réparation"],
  ["QUALITY_CHECK", "Quality check", "Contrôle qualité"],
  ["READY", "Ready", "Prêt"],
  ["COMPLETED", "Completed", "Terminé"],
  ["CANCELLED", "Cancelled", "Annulé"],
  ["REJECTED", "Rejected", "Refusé"],
] as const;

type Code = (typeof STATUSES)[number][0];

function status(code: Code) {
  const [, en, fr] = STATUSES.find(([entry]) => entry === code)!;
  return {
    code,
    translations: [
      { locale: "EN" as const, label: en },
      { locale: "FR" as const, label: fr },
    ],
  };
}

// Each moment's history, as opening days before today and a time on the Location's clock,
// so it reads as last week's work in opening hours whenever it's opened. The
// photos follow the watch: dropped off cracked, opened on the bench, mended.
// Any of those days can be a Saturday, so every time fits its shorter hours.
type When = [daysAgo: number, time: string];

const HISTORY: Record<Moment, [Code, When][]> = {
  received: [["RECEIVED", [1, "10:12"]]],
  approval: [
    ["RECEIVED", [2, "10:12"]],
    ["DIAGNOSING", [2, "15:40"]],
    ["AWAITING_APPROVAL", [1, "10:25"]],
  ],
  repair: [
    ["RECEIVED", [3, "10:12"]],
    ["DIAGNOSING", [3, "15:40"]],
    ["AWAITING_APPROVAL", [2, "10:25"]],
    ["REPAIRING", [1, "11:30"]],
  ],
  ready: [
    ["RECEIVED", [4, "10:12"]],
    ["DIAGNOSING", [4, "15:40"]],
    ["AWAITING_APPROVAL", [3, "10:25"]],
    ["REPAIRING", [2, "11:30"]],
    ["QUALITY_CHECK", [1, "15:55"]],
    ["READY", [1, "16:40"]],
  ],
};

const PHOTOS: Record<Moment, [string, When][]> = {
  received: [["/demo/watch-1.webp", [1, "10:14"]]],
  approval: [
    ["/demo/watch-1.webp", [2, "10:14"]],
    ["/demo/watch-2.webp", [2, "15:38"]],
  ],
  repair: [
    ["/demo/watch-1.webp", [3, "10:14"]],
    ["/demo/watch-2.webp", [3, "15:38"]],
  ],
  ready: [
    ["/demo/watch-1.webp", [4, "10:14"]],
    ["/demo/watch-2.webp", [4, "15:38"]],
    ["/demo/watch-3.webp", [1, "16:35"]],
  ],
};

const DAY_MS = 24 * 60 * 60_000;
// Tuesday to Saturday, as getUTCDay() numbers them.
const OPEN_DAYS = [2, 3, 4, 5, 6];

// The instant a Brussels wall-clock time falls on, its offset read from Intl
// since it changes with daylight saving.
function onShopClock(date: string, time: string) {
  const asUtc = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(asUtc);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)!.value);
  const shown = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
  return new Date(asUtc.getTime() - (shown - asUtc.getTime()));
}

const HOURS: Tracking["location"]["openingHours"] = [
  ...(["Tuesday", "Wednesday", "Thursday", "Friday"] as const).flatMap((dayOfWeek) => [
    { dayOfWeek, opens: "09:30", closes: "12:30" },
    { dayOfWeek, opens: "13:30", closes: "18:00" },
  ]),
  { dayOfWeek: "Saturday", opens: "10:00", closes: "17:00" },
];

export function demoTracking(moment: Moment, title: string, locale: string, now: Date): Tracking {
  // Counted in days the Location opens, so nothing happens on a Sunday or Monday.
  const day = (offset: number) => {
    let date = calendarDateIn(now, TIME_ZONE);
    for (let left = Math.abs(offset); left > 0;) {
      date = new Date(new Date(`${date}T12:00:00Z`).getTime() + Math.sign(offset) * DAY_MS).toISOString().slice(0, 10);
      if (OPEN_DAYS.includes(new Date(`${date}T12:00:00Z`).getUTCDay())) left--;
    }
    return date;
  };
  const at = ([daysAgo, time]: When) => onShopClock(day(-daysAgo), time).toISOString();
  const history = HISTORY[moment];

  return {
    trackingCode: "demo",
    title,
    locale: locale.toUpperCase() === "FR" ? "FR" : "EN",
    createdAt: at(history[0][1]),
    estimatedReadyDate: moment === "ready" ? null : day(2),
    customerCollectedAt: null,
    currentStatus: status(history.at(-1)![0]),
    steps: STATUSES.map(([code], index) => ({ position: index + 1, status: status(code) })),
    statusHistory: history.map(([code, when]) => ({ status: status(code), createdAt: at(when) })),
    photos: PHOTOS[moment].map(([url, when]) => ({ url, createdAt: at(when) })),
    asksForFeedback: false,
    reviewUrl: null,
    feedback: null,
    location: {
      name: "Atelier Lemaire",
      contactPhone: "+3221234567",
      contactEmail: "bonjour@atelier-lemaire.be",
      logoUrl: "/demo/logo.webp",
      bannerUrl: "/demo/banner.webp",
      address: {
        streetAddress: "Rue de la Paix 12",
        postalCode: "1050",
        addressLocality: "Ixelles",
        addressCountry: "BE",
      },
      mapsUrl: "https://www.google.com/maps",
      openingHours: HOURS,
      timeZone: TIME_ZONE,
    },
  };
}
