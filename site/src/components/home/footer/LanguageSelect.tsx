"use client";

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const NAMES: Record<(typeof routing.locales)[number], string> = { en: "English", fr: "Français", nl: "Nederlands" };

// Ledger's language picker: a native select laid invisibly over the label,
// so the system's own list opens on every device.
export function LanguageSelect({ label }: { label: string }) {
  const locale = useLocale() as keyof typeof NAMES;
  const pathname = usePathname();

  return (
    <label className="caption footer__lang">
      <img src="/home/icon-globe.svg" alt="" width="20" height="20" loading="lazy" />
      <span>{NAMES[locale]}</span>
      <img src="/home/icon-caret-down.svg" alt="" width="16" height="16" loading="lazy" />
      <select
        className="footer__lang-select"
        name="language"
        aria-label={label}
        value={locale}
        // A full load, not a client navigation: the page's scroll timelines
        // and Temlis scripts start once, on the document they found.
        onChange={(event) => window.location.assign(`/${event.target.value}${pathname === "/" ? "" : pathname}`)}
      >
        {routing.locales.map((other) => (
          <option key={other} value={other}>
            {NAMES[other]}
          </option>
        ))}
      </select>
    </label>
  );
}
