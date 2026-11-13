import type { routing } from "@/i18n/routing";

export type SiteLocale = (typeof routing.locales)[number];

// One page per trade, for the searches shop owners make (ADR 0145). The steps
// are the trade's default Workflow in the app (packages/db/prisma/catalogue.ts),
// between Received and Ready, so a page shows what a new shop really gets.
export const TRADES = {
  shoe: { slugs: { fr: "cordonnerie", nl: "schoenmaker", en: "shoe-repair" }, steps: ["REPAIRING"] },
  pressing: { slugs: { fr: "pressing", nl: "droogkuis", en: "dry-cleaning" }, steps: ["CLEANING"] },
  tailoring: { slugs: { fr: "retouches", nl: "kleermaker", en: "tailoring" }, steps: ["FITTING", "ALTERATION"] },
  electronics: {
    slugs: { fr: "reparation-telephone", nl: "gsm-herstelling", en: "phone-repair" },
    steps: ["DIAGNOSING", "REPAIRING"],
  },
  watch: {
    slugs: { fr: "horlogerie", nl: "horlogemaker", en: "watch-repair" },
    steps: ["DIAGNOSING", "REPAIRING", "QUALITY_CHECK"],
  },
  garage: { slugs: { fr: "garage", nl: "garage", en: "garage" }, steps: ["DIAGNOSING", "REPAIRING"] },
  appliance: {
    slugs: { fr: "electromenager", nl: "huishoudtoestellen", en: "appliance-repair" },
    steps: ["DIAGNOSING", "AWAITING_PARTS", "REPAIRING"],
  },
  framing: {
    slugs: { fr: "encadrement", nl: "lijstenmaker", en: "picture-framing" },
    steps: ["IN_PROGRESS", "QUALITY_CHECK"],
  },
} as const satisfies Record<string, { slugs: Record<SiteLocale, string>; steps: readonly string[] }>;

export type Trade = keyof typeof TRADES;

export const TRADE_KEYS = Object.keys(TRADES) as Trade[];

export function tradeFromSlug(locale: SiteLocale, slug: string) {
  return TRADE_KEYS.find((trade) => TRADES[trade].slugs[locale] === slug);
}

export const tradePath = (locale: SiteLocale, trade: Trade) => `/${locale}/${TRADES[trade].slugs[locale]}`;
